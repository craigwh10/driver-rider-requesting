##############
# Meta
##############

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "5.8.0"
    }
  }
}

provider "aws" {
    region = "eu-west-1"
}

##############
# Services
##############

resource "aws_sqs_queue" "ms_queue" {
  name                      = "ms_queue"
  delay_seconds             = 0
  /*
  This means that as soon as a message (in this case, a response)
  is sent to the SQS queue, it will be immediately available for retrieval and processing.
  */
  max_message_size          = 2048
  message_retention_seconds = 86400
  receive_wait_time_seconds = 2 # How long consumer needs to wait for poll
}

# Ref: https://github.com/terraform-aws-modules/terraform-aws-lambda/blob/master/examples/container-image/main.tf
module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "get-profile-lambda"
  description   = "gets profiles for different types of user"

  # dist.index.handler as: dist is a directory contained within the archive.
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  local_existing_package = "../get-profile-lambda/dist.zip"
  # referenced this from
  # https://registry.terraform.io/modules/terraform-aws-modules/lambda/aws/latest#lambda-functions-with-existing-package-prebuilt-stored-locally
  # assume this is that it wont try to make an archive, it already exists
  create_package         = false

  attach_policy_json = true
  policy_json        = jsonencode(
    {
        "Version": "2012-10-17",
        "Statement": [
            {
              Effect   = "Allow"
              Action   = [
                "dynamodb:GetItem",
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "sqs:GetQueueAttributes",
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:SendMessage"
              ]
              Resource = "*"
            }
        ]
    })

  event_source_mapping = {
    sqs = {
      event_source_arn        = aws_sqs_queue.ms_queue.arn
      function_response_types = ["ReportBatchItemFailures"]
      scaling_config          = {
        maximum_concurrency = 2
      }

      filter_criteria = {
        pattern = jsonencode({
          "messageAttributes": {
            "event_name": {
              "stringValue": ["profile_data_requested"]
            }
          }
        })
      }

    }
  }

  tags = {
    Terraform   = "true"
    Environment = "development"
  }
}

module "dynamodb_table" {
  source                      = "terraform-aws-modules/dynamodb-table/aws"

  name                        = "profiles"
  hash_key                    = "id"
  range_key                   = "type"
  deletion_protection_enabled = false

  attributes = [
    {
        name = "id"
        type = "S"
    },
    {
        name = "type"
        type = "S"
    }
  ]

  tags = {
    Terraform   = "true"
    Environment = "development"
  }
}