variable "name" {
  type = string
}

variable "bucket_force_destroy" {
  type    = bool
  default = false
}

variable "enable_versioning" {
  type    = bool
  default = false
}
