import { APIGatewayProxyEvent, APIGatewayProxyResult, SQSEvent } from "aws-lambda";
import { DynamoDBClient, DynamoDB, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const region = "eu-west-1";
const dynamoDBClient = new DynamoDBClient({ region });
const sqsClient = new SQSClient({ region });

const BadRequest = (msg: string) => ({
    statusCode: 400,
    body: msg
})

interface RequestBody {
    id: string;
    type: 'driver' | 'rider';
}

const handleDDBGet = async (parsedBody: RequestBody) => {
    if (!parsedBody?.id) return BadRequest('No "id" provided in body of request');
    if (!parsedBody?.type) return BadRequest('Missing "type" on body of request');
    if (!['driver', 'rider'].includes(parsedBody.type)) return BadRequest('"type" in body is not: {"driver", "rider"}');

    console.log('making GetItemCommand call');

    const res = await dynamoDBClient.send(new GetItemCommand({
        TableName: "profiles",
        Key: {
            id: { S: parsedBody.id },
            type: { S: parsedBody.type },
        },
    }))

    console.log('DynamoDb res', res);

    if (!res.Item) return undefined;

    /**
     * @example status 200:
     * {"description":{"S":"mercedes benz"},"id":{"S":"123456"},"type":{"S":"driver"}}'
     */
    return {
        id: res.Item.id.S,
        type: res.Item.type.S,
        description: res.Item.description?.S
    }
}

export async function handler(event: SQSEvent): Promise<void> {
    try {
        await Promise.all(
            event?.Records.map(async (record) => {
                const { body, eventSourceARN } = record;
                if (!record.body) return BadRequest("Missing body from request");

                const parsedBody: RequestBody = JSON.parse(record.body);

                console.log('handling DDBGet')
                const response = await handleDDBGet(parsedBody);
                console.log('response', response);

                // "eventSourceARN": "arn:aws:sqs:region:id:resource_name",
                const properties = eventSourceARN.split(':');
                const resourceName = properties.at(-1);
                const id = properties.at(-2);

                console.log('properties', JSON.stringify(properties));

                // region is only eu-west-1 for this app.
                const url = `https://sqs.eu-west-1.amazonaws.com/${id}/${resourceName}`;

                await sqsClient.send(new SendMessageCommand({
                    QueueUrl: url,
                    MessageBody: JSON.stringify(response)
                }))
            })
        )
    } catch (err: any) {
        console.log(err.message);
    }
}
