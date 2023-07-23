import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-west-1'
})

const sqs = new AWS.SQS();

export const sendMessage = (message: string) => {
    if (!process.env.QUEUE_URL) {
        console.log('message aborted, no queue url provided')
        return;
    }

    sqs.sendMessage({
        QueueUrl: process.env.QUEUE_URL,
        MessageBody: message
    }, function(err, data) {
        if (err) {
            console.log('Error publishing message:', err);
        } else {
            console.log('Message published:', data.MessageId);
        }
    });
}
