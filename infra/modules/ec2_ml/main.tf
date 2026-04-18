data "aws_ami" "dlami_ubuntu" {
  count       = var.ami_id == "" ? 1 : 0
  most_recent = true
  owners      = ["898082745236"] # AWS Deep Learning AMI owner id

  filter {
    name   = "name"
    values = ["Deep Learning OSS Nvidia Driver AMI GPU PyTorch*Ubuntu 22.04*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

locals {
  ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.dlami_ubuntu[0].id
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-ml-sg"
  description = "SG for ML GPU EC2. SSH from admin, inference from backend."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ml-sg"
  })
}

resource "aws_security_group_rule" "ssh" {
  count             = length(var.admin_cidrs) > 0 ? 1 : 0
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.admin_cidrs
  security_group_id = aws_security_group.this.id
  description       = "SSH from admin CIDRs"
}

resource "aws_security_group_rule" "inference_from_sg" {
  count                    = length(var.allow_inference_from_security_group_ids)
  type                     = "ingress"
  from_port                = var.inference_port
  to_port                  = var.inference_port
  protocol                 = "tcp"
  source_security_group_id = var.allow_inference_from_security_group_ids[count.index]
  security_group_id        = aws_security_group.this.id
  description              = "Inference API from peer SG #${count.index}"
}

data "aws_iam_policy_document" "instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name_prefix}-ml-role"
  assume_role_policy = data.aws_iam_policy_document.instance_assume.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "cw_agent" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

data "aws_iam_policy_document" "s3" {
  count = length(var.s3_bucket_arns) > 0 ? 1 : 0

  statement {
    sid = "BucketList"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = var.s3_bucket_arns
  }

  statement {
    sid = "ObjectAccess"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [for arn in var.s3_bucket_arns : "${arn}/*"]
  }
}

resource "aws_iam_role_policy" "s3" {
  count  = length(var.s3_bucket_arns) > 0 ? 1 : 0
  name   = "${var.name_prefix}-ml-s3"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.s3[0].json
}

resource "aws_iam_instance_profile" "this" {
  name = "${var.name_prefix}-ml-instance-profile"
  role = aws_iam_role.this.name
  tags = var.tags
}

resource "aws_eip" "this" {
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ml-eip"
  })
}

resource "aws_instance" "this" {
  ami                         = local.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.this.id]
  iam_instance_profile        = aws_iam_instance_profile.this.name
  key_name                    = var.key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = var.root_volume_type
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-ml-gpu"
  })
}

resource "aws_eip_association" "this" {
  instance_id   = aws_instance.this.id
  allocation_id = aws_eip.this.id
}
