# Terraform

## Core

- terraform init
- terraform plan
- terraform apply
- terraform destroy

## Issues

If `terraform destroy` doesnt work because:

```
No changes. No objects need to be destroyed.

Either you have not created any objects yet or the existing objects were already deleted outside of
Terraform.

Destroy complete! Resources: 0 destroyed.
```

and 

```
terraform show

results in no state file
```

do

```
terraform import aws_kinesis_stream.kinesis_stream app_kinesis_stream_tf

resource "aws_kinesis_stream" "kinesis_stream" {
    name = "app_kinesis_stream_tf"
```

then you should be able to destroy as the state is there

---

**Deploying Kinesis w/ implementation notes:**

```
resource "aws_kinesis_stream" "kinesis_stream" {
    name = "app_kinesis_stream_tf"
    shard_count = 1
    retention_period = 24 # Hours

    tags = {
        Name = "app_kinesis_stream_tf"
    }
}
```

```ts
import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'eu-west-1'
})

const kinesis = new AWS.Kinesis();
const kinesisStreamName = 'app_kinesis_stream_tf'

const params: AWS.Kinesis.PutRecordInput = {
    StreamName: kinesisStreamName,
    Data: Buffer.from(JSON.stringify({
        foo: 'bar'
    })),
    PartitionKey: '1'
};

export const putRecord = () => {
    kinesis.putRecord(params, (err, data) => {
        if (err) console.log(err, err.stack);
        else console.log(data);
    });
};
```