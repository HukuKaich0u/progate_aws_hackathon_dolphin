locals {
  name_prefix  = "dolphin-${var.env}"
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}

data "aws_caller_identity" "current" {}

# Reuse the sandbox account's default VPC so we do not burn quota on NAT/subnets.
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

module "cpu_fleet" {
  source = "../../modules/ec2_cpu_fleet"

  name_prefix = local.name_prefix
  vpc_id      = data.aws_vpc.default.id
  subnet_ids  = data.aws_subnets.default.ids

  fleet_size                = var.fleet_size
  instance_type             = var.instance_type
  key_name                  = var.key_name
  admin_cidrs               = []
  iam_instance_profile_name = aws_iam_instance_profile.worker.name
  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    region    = var.aws_region
    registry  = local.ecr_registry
    image_uri = "${aws_ecr_repository.hello.repository_url}:latest"
  })

  # Launch the parent first so its 2 vCPU are reserved before the ASG starts
  # filling the remaining 254 vCPU budget. Otherwise they race at the quota.
  depends_on = [aws_instance.parent]
}

resource "aws_security_group" "parent" {
  name        = "${local.name_prefix}-parent-sg"
  description = "SG for the dispatcher (parent) instance."
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-parent-sg"
  }
}

resource "aws_security_group_rule" "parent_ssh" {
  count             = length(var.admin_cidrs) > 0 ? 1 : 0
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = var.admin_cidrs
  security_group_id = aws_security_group.parent.id
  description       = "SSH from admin CIDRs"
}

# Horizontal coupling: worker fleet accepts traffic from the parent SG.
# Per CLAUDE.md, cross-module SG wiring lives at the environment layer.
resource "aws_security_group_rule" "worker_ssh_from_parent" {
  type                     = "ingress"
  from_port                = 22
  to_port                  = 22
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.parent.id
  security_group_id        = module.cpu_fleet.security_group_id
  description              = "SSH from dispatcher"
}

resource "aws_security_group_rule" "worker_http_from_parent" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.parent.id
  security_group_id        = module.cpu_fleet.security_group_id
  description              = "HTTP app port from dispatcher"
}

resource "aws_instance" "parent" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = var.parent_instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.parent.id]
  key_name                    = var.key_name != "" ? var.key_name : null
  iam_instance_profile        = aws_iam_instance_profile.parent.name
  associate_public_ip_address = true

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tags = {
    Name = "${local.name_prefix}-parent"
  }
}

# -----------------------------------------------------------------------------
# ECR repository for the hello FastAPI image
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "hello" {
  name                 = "${local.name_prefix}-hello"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false
  }
}

# -----------------------------------------------------------------------------
# IAM for workers (pull image, SSM for debugging)
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "worker" {
  name               = "${local.name_prefix}-worker-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "worker_ecr" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "worker_ssm" {
  role       = aws_iam_role.worker.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "worker" {
  name = "${local.name_prefix}-worker-profile"
  role = aws_iam_role.worker.name
}

# -----------------------------------------------------------------------------
# IAM for parent (push image, describe workers, SSM)
# -----------------------------------------------------------------------------
resource "aws_iam_role" "parent" {
  name               = "${local.name_prefix}-parent-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "parent_ecr" {
  role       = aws_iam_role.parent.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_role_policy_attachment" "parent_ec2_ro" {
  role       = aws_iam_role.parent.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "parent_ssm" {
  role       = aws_iam_role.parent.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "parent" {
  name = "${local.name_prefix}-parent-profile"
  role = aws_iam_role.parent.name
}
