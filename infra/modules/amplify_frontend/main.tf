locals {
  app_name   = "${var.name_prefix}-frontend"
  branch_url = "https://${var.branch_name}.${aws_amplify_app.this.default_domain}"
}

resource "aws_amplify_app" "this" {
  name                     = local.app_name
  platform                 = "WEB"
  enable_branch_auto_build = false

  environment_variables = merge(
    {
      AMPLIFY_MONOREPO_APP_ROOT = var.app_root
    },
    var.environment_variables,
  )

  build_spec = yamlencode({
    version = 1
    frontend = {
      phases = {
        preBuild = {
          commands = [
            "cd ${var.app_root} && npm ci",
          ]
        }
        build = {
          commands = [
            "cd ${var.app_root} && npm run build",
          ]
        }
      }
      artifacts = {
        baseDirectory = "${var.app_root}/dist"
        files = [
          "**/*",
        ]
      }
      cache = {
        paths = [
          "${var.app_root}/node_modules/**/*",
        ]
      }
    }
  })

  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webp|woff|woff2|ttf)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }

  tags = merge(var.tags, {
    Name = local.app_name
  })
}

resource "aws_amplify_branch" "this" {
  app_id            = aws_amplify_app.this.id
  branch_name       = var.branch_name
  display_name      = var.branch_name
  enable_auto_build = var.enable_auto_build
  framework         = "React"
  stage             = var.stage

  tags = merge(var.tags, {
    Name = "${local.app_name}-${var.branch_name}"
  })
}
