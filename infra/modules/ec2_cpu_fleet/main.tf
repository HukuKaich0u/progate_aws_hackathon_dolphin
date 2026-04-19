data "aws_ami" "al2023" {
  count       = var.ami_id == "" ? 1 : 0
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

locals {
  ami_id = var.ami_id != "" ? var.ami_id : data.aws_ami.al2023[0].id
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-fleet-sg"
  description = "SG for CPU worker fleet. Egress only by default."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-fleet-sg"
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

resource "aws_launch_template" "this" {
  name_prefix   = "${var.name_prefix}-fleet-"
  image_id      = local.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name != "" ? var.key_name : null
  user_data     = var.user_data != "" ? base64encode(var.user_data) : null

  vpc_security_group_ids = [aws_security_group.this.id]

  dynamic "iam_instance_profile" {
    for_each = var.iam_instance_profile_name != "" ? [1] : []
    content {
      name = var.iam_instance_profile_name
    }
  }

  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  tag_specifications {
    resource_type = "instance"
    tags = merge(var.tags, {
      Name = "${var.name_prefix}-fleet-worker"
    })
  }

  tag_specifications {
    resource_type = "volume"
    tags = merge(var.tags, {
      Name = "${var.name_prefix}-fleet-worker-vol"
    })
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-fleet-lt"
  })
}

resource "aws_autoscaling_group" "this" {
  name                = "${var.name_prefix}-fleet-asg"
  vpc_zone_identifier = var.subnet_ids

  min_size         = 0
  max_size         = var.fleet_size
  desired_capacity = var.fleet_size

  health_check_type         = "EC2"
  health_check_grace_period = 60
  capacity_rebalance        = false
  default_cooldown          = 0
  wait_for_capacity_timeout = "0"

  launch_template {
    id      = aws_launch_template.this.id
    version = "$Latest"
  }

  instance_refresh {
    strategy = "Rolling"
    triggers = ["launch_template"]
  }

  dynamic "tag" {
    for_each = merge(var.tags, {
      Name = "${var.name_prefix}-fleet-asg"
    })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = false
    }
  }
}
