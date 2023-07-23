Decision: To give the agent user Iam:Passrole for terraform actions, there
is no way to dynamically pass the ARN of lambda to a policy to be
dynamically generated as the lambda needs to be created to get the ARN.

Also on the basis that serverless framework provides this too as a minimal
IAM policy setup against resource * - then I'm going to do the same, as it was burning my brain
trying to work around this.

But I learnt about secrets, variables, locals, dependson & truly what attachment is doing.

```hcl
  lambda_role = aws_iam_role.lambda_role.arn
# This is the culprit of PassRole on CreateFunction, it's
# a strict dependency.
```

These are the referenced files at the date 22/07/23 for learning.

secret.tfvars
```hcl
agent_arn = "your_agent_arn"
```

main.tf
```hcl
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

locals {
  lambda_function_arn = module.lambda_function.lambda_function_arn
}

variable "agent_arn" {
  type        = string
  description = "The user ARN that you want to apply the dynamic policy to"
  default     = ""
  sensitive   = true
}

##############
# IAM
##############

resource "aws_iam_role" "lambda_role" {
  name = "uberclone-lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect  = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action  = "sts:AssumeRole"
      }
    ]
  })
}

# Creating policy for lambda role to inherit
resource "aws_iam_policy" "lambda_policy" {
  name        = "uberclone-lambda-policy"
  description = "Policy for Lambda function for uberclone"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:GetItem",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "*"
      }
    ]
  })
}

# Attaching role to policy
resource "aws_iam_role_policy_attachment" "lambda_attachment" {
  policy_arn = aws_iam_policy.lambda_policy.arn
  role       = aws_iam_role.lambda_role.name
  depends_on = [aws_iam_role.lambda_role]
}

##
# IAM - Adding dynamic policy to user ARN
#       to allow Lambda:CreateFunction with IAM:PassRole
#       to be used by the manually created user
#       ---
#       This has to be passed SECURELY as it will
#       have to include the user's ARN to apply the new dynamic
#       policy to.
##

# Creating policy for lambda role to inherit
resource "aws_iam_policy" "create_function_for_lambda" {
  name        = "uberclone-create-function-policy"
  description = "Policy applied to allow creation of a dynamic lambda arn via tf"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "lambda:CreateFunction",
          "iam:PassRole"
        ]
        Resource = [
            local.lambda_function_arn
        ]
      }
    ]
  })
}

# Attaching role to user
resource "aws_iam_user_policy_attachment" "dynamic_create_function_user_attachment" {
  policy_arn = aws_iam_policy.create_function_for_lambda.arn
  user       = var.agent_arn
  depends_on = [aws_iam_role_policy_attachment.lambda_attachment]
}

##############
# Services
##############

module "lambda_function" {
  source = "terraform-aws-modules/lambda/aws"

  function_name = "get-profile-lambda"
  description   = "gets profiles for different types of user"
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  local_existing_package = "../dist.zip"
  create_package         = false
  # referenced this from
  # https://registry.terraform.io/modules/terraform-aws-modules/lambda/aws/latest#lambda-functions-with-existing-package-prebuilt-stored-locally
  # assume this is that it wont try to make an archive, it already exists

  lambda_role = aws_iam_role.lambda_role.arn

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

```