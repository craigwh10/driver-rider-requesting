**Incoming records from SQS**

```json
{
  "Records": [
    {
      "messageId": "uuid",
      "receiptHandle": "base64style",
      "body": "{\"id\": \"123456\", \"type\": \"driver\"}",
      "attributes": {
        "ApproximateReceiveCount": "1",
        "SentTimestamp": "1690064329804",
        "SenderId": "id",
        "ApproximateFirstReceiveTimestamp": "1690064329811"
      },
      "messageAttributes": {
        "event_name": {
          "stringValue": "profile_data_requested",
          "stringListValues": [],
          "binaryListValues": [],
          "dataType": "String"
        }
      },
      "md5OfBody": "uuid",
      "md5OfMessageAttributes": "uuid",
      "eventSource": "aws:sqs",
      "eventSourceARN": "",
      "awsRegion": "eu-west-1"
    }
  ]
}
```

- tf syntax: https://registry.terraform.io/providers/hashicorp/awscc/latest/docs/data-sources/lambda_event_source_mapping#nestedatt--filter_criteria--filters
- filtersyntax: https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html#:~:text=when%20filtering%20them.-,Filter%20rule%20syntax,-For%20filter%20rules