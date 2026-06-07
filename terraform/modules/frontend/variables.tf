variable "name" {
  type = string
}

variable "alb_dns_name" {
  type = string
}

variable "index_document" {
  type    = string
  default = "index.html"
}

variable "price_class" {
  type    = string
  default = "PriceClass_200"
}
