terraform {
  backend "s3" {
    bucket       = "brainx-dev-terraform-state-049882582319-ap-northeast-2"
    key          = "brainx/dev/terraform.tfstate"
    region       = "ap-northeast-2"
    use_lockfile = true
    encrypt      = true
  }
}
