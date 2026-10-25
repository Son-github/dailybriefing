"""README용 편집 가능한 SVG 생성. 네트워크/AWS 접근 없이 저장된 공식 아이콘만 사용합니다."""
from html import escape
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs/assets/architecture"
INK, MUTED, BLUE, GREEN, PURPLE = "#152b45", "#60738b", "#3478c7", "#348354", "#7653ad"


class Diagram:
    def __init__(self, width, height, title, subtitle):
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">',
                      f'<title id="title">{escape(title)}</title><desc id="desc">{escape(subtitle)}</desc>',
                      '<defs><marker id="arrow-blue" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#3478c7"/></marker><marker id="arrow-green" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#348354"/></marker><marker id="arrow-purple" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#7653ad"/></marker></defs>',
                      f'<rect width="{width}" height="{height}" fill="#fff"/>',
                      '<style>text{font-family:Arial,"Noto Sans",sans-serif} .label{paint-order:stroke;stroke:#fff;stroke-width:7px;stroke-linejoin:round}</style>']
        self.text(42, 48, title, 30, weight=700)
        self.text(42, 80, subtitle, 17, MUTED)
        for path in sorted((ASSETS / "icons").glob("*.svg")):
            source = path.read_text()
            view = ET.fromstring(source).attrib.get("viewBox", "0 0 64 64")
            inner = re.sub(r'^.*?<svg\b[^>]*>', '', source, count=1, flags=re.S)
            inner = re.sub(r'</svg>\s*$', '', inner)
            for ident in set(re.findall(r'\bid="([^"]+)"', inner)):
                inner = inner.replace(f'id="{ident}"', f'id="{path.stem}-{ident}"').replace(f'#{ident})', f'#{path.stem}-{ident})')
            self.parts.append(f'<defs><symbol id="icon-{path.stem}" viewBox="{view}">{inner}</symbol></defs>')

    def text(self, x, y, value, size=19, color=INK, weight=400, anchor="start", label=False):
        self.parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"'+(' class="label"' if label else '')+f'>{escape(value)}</text>')

    def rect(self, x, y, w, h, fill="#fff", stroke="#d4dde7", dash=False, radius=12, width=1.5):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{width}"'+(' stroke-dasharray="7 6"' if dash else '')+'/>')

    def boundary(self, x, y, w, h, title, color, fill="#fff", dash=False):
        self.rect(x,y,w,h,fill,color,dash,16,2)
        self.text(x+18,y+30,title,19,color,700)

    def icon(self, name, x, y, size=48):
        self.parts.append(f'<use href="#icon-{name}" xlink:href="#icon-{name}" x="{x}" y="{y}" width="{size}" height="{size}"/>')

    def card(self, x, y, w, h, title, detail="", icon=None, color=BLUE, fill="#fff", dash=False):
        self.rect(x,y,w,h,fill,"#b7c8da" if not dash else "#b5c3d3",dash)
        if icon:
            self.icon(icon,x+15,y+(h-48)/2)
        tx=x+(78 if icon else 18)
        self.text(tx,y+h/2-2,title,20,color,700)
        if detail:
            self.text(tx,y+h/2+23,detail,15,MUTED)

    def line(self, path, color="blue", dash=False):
        colors={"blue":BLUE,"green":GREEN,"purple":PURPLE}
        self.parts.append(f'<path d="{path}" fill="none" stroke="{colors[color]}" stroke-width="2.4" stroke-linejoin="round" marker-end="url(#arrow-{color})"'+(' stroke-dasharray="7 5"' if dash else '')+'/>')

    def save(self, name):
        (ASSETS / f"{name}.svg").write_text("\n".join(self.parts)+"\n</svg>\n")


def cloud():
    d=Diagram(1800,1160,"Daily Briefing | Cloud architecture", "Implemented service topology · Seoul region · Single task / Single-AZ database · Route 53 is not used")
    d.boundary(250,120,1505,925,"AWS Cloud",INK,"#fcfdff")
    d.boundary(570,158,1145,865,"Asia Pacific (Seoul) · ap-northeast-2",BLUE,"#f8fbff",True)
    d.boundary(600,325,1085,530,"Amazon VPC · 10.20.0.0/16",PURPLE)
    d.boundary(625,382,500,450,"Availability Zone A · ap-northeast-2a",MUTED,"#fff",True)
    d.boundary(1145,382,515,450,"Availability Zone C · ap-northeast-2c",MUTED,"#fff",True)
    for x,w,public,app,db in [(640,470,"10.20.1.0/24","10.20.11.0/24","10.20.21.0/24"),(1160,485,"10.20.2.0/24","10.20.12.0/24","10.20.22.0/24")]:
        for y,h,label,cidr,fill,color in [(430,130,"Public subnet",public,"#f1f9ef",GREEN),(580,110,"Private app subnet",app,"#edf5fe",BLUE),(710,105,"Private DB subnet",db,"#f3f2fc",PURPLE)]:
            d.rect(x,y,w,h,fill,"#d8e2eb",False,8)
            d.text(x+12,y+22,f"{label} · {cidr}",15,color,700)
    # 요청/아웃바운드 선은 노드 아래에 배치하여 라벨과 겹치지 않게 합니다.
    d.line("M210 357 H300")
    d.text(215,340,"HTTPS",14,BLUE,label=True)
    d.line("M510 330 H548 V250 H600")
    d.text(550,307,"Static + OAC",14,BLUE,label=True)
    d.line("M510 377 H555 V368 H1135 V446 H1050 V458")
    d.text(300,460,"/api/* → ALB",17,BLUE)
    d.text(300,486,"HTTPS · caching disabled",15,MUTED)
    d.line("M1050 545 H1060 V645 H1020")
    d.text(1035,569,"HTTP :8080",14,BLUE,label=True)
    d.line("M850 675 V701 H1085 V780 H1020")
    d.text(865,704,"TLS :5432",14,BLUE,label=True)
    d.line("M660 645 H645 V568 H710 V546", "green")
    d.line("M650 509 H610", "green")
    d.line("M575 509 H270 V745 H220", "green")
    d.text(280,531,"HTTPS egress via NAT",15,GREEN,label=True)
    d.line("M1020 650 H1135 V903 H875 V970 H900", "purple",True)
    d.text(1078,918,"Logs / metrics",15,PURPLE,label=True)
    d.line("M130 250 V302","purple",True)
    d.line("M130 415 V490","green",True)
    # Edge/서비스 노드
    d.card(40,150,180,100,"Gabia DNS","CNAME records",color=PURPLE)
    d.card(40,302,170,113,"Users","Web / Mobile",color=INK)
    d.card(40,490,180,100,"Kakao SDK","Browser → CDN",color=GREEN)
    d.card(40,685,180,135,"External APIs","KMA / NAVER",color=GREEN)
    d.text(58,794,"Kakao / EXIM / KASI",14,MUTED)
    d.text(300,208,"GLOBAL EDGE",15,MUTED,700)
    d.card(300,300,210,115,"CloudFront","www domain", "cloudfront",PURPLE)
    d.card(300,555,235,105,"ACM · HTTPS","us-east-1", "acm",PURPLE)
    d.text(300,685,"SPA routing · OAC",17,MUTED)
    d.text(300,716,"CSP / HSTS headers",17,MUTED)
    d.text(300,747,"Host-only auth cookies",17,MUTED)
    d.card(600,210,250,83,"Private S3","React + runtime config","s3",GREEN)
    d.card(870,210,230,83,"Amazon ECR","Immutable image digest","ecr",BLUE)
    d.card(1120,210,275,83,"SSM / Secrets","API keys + DB secret","secrets",PURPLE)
    d.card(1415,210,270,83,"ACM · API TLS","ap-northeast-2","acm",PURPLE)
    d.card(650,476,165,70,"NAT","1 gateway","nat",GREEN)
    d.icon("igw",576,486,44)
    d.text(574,564,"IGW",14,GREEN,700)
    d.card(850,458,400,87,"Application Load Balancer","Public placement across both AZs","alb",PURPLE)
    d.card(660,612,360,63,"ECS Fargate","Spring Boot · 1 task · no public IP","fargate",BLUE)
    d.card(660,748,360,63,"RDS PostgreSQL 17","db.t4g.micro · Single-AZ","rds",PURPLE)
    d.card(1180,612,445,63,"App capacity for expansion","Subnet provisioned · no running task",color=MUTED,fill="#f9fbfd",dash=True)
    d.card(1180,748,445,63,"DB subnet group member","No standby database in this AZ",color=MUTED,fill="#f9fbfd",dash=True)
    d.card(600,930,270,80,"Terraform state","Separate bootstrap S3","s3",GREEN)
    d.card(900,930,325,80,"CloudWatch","Logs / request IDs / alarms","cloudwatch",PURPLE)
    d.card(1250,930,435,80,"Interview lifecycle","Final snapshot → restore before LIVE","rds",PURPLE)
    d.text(42,1091,"REQUEST FLOW",15,BLUE,700)
    d.text(220,1091,"Users → CloudFront → S3 or ALB → private Fargate → private RDS",18)
    d.text(42,1126,"SECURITY",15,PURPLE,700)
    d.text(220,1126,"ALB :443 accepts CloudFront prefix list only · ECS :8080 from ALB SG · DB :5432 from ECS SG",17)
    d.save("cloud-architecture")


def delivery():
    d=Diagram(1800,675,"Daily Briefing | Delivery & infrastructure", "GitHub OIDC for application delivery · Terraform infrastructure changes are reviewed and applied by the operator")
    d.boundary(385,130,470,330,"GitHub Actions",MUTED,"#f8fafc")
    d.boundary(920,130,830,330,"AWS · existing deployment targets",INK,"#fcfdff")
    d.line("M205 266 H350 V215 H410")
    d.line("M615 215 H660")
    d.line("M830 215 H950","purple")
    d.text(858,194,"OIDC",15,PURPLE,label=True)
    d.line("M1155 215 H1200")
    d.line("M1420 215 H1480")
    d.line("M855 375 H1200")
    d.text(975,361,"Frontend build",15,BLUE,label=True)
    d.line("M1420 375 H1480")
    d.card(40,215,165,100,"GitHub","main / manual",color=INK)
    d.card(410,175,205,80,"Verify","Unit + integration",color=BLUE)
    d.card(660,175,170,80,"Build","Docker / Vite",color=BLUE)
    d.card(410,335,420,80,"Application delivery","Image-only → ECS deployment → API smoke",color=BLUE)
    d.card(950,175,205,80,"IAM role","Short-lived auth","iam",PURPLE)
    d.card(1200,175,220,80,"Amazon ECR","Unique CI tags","ecr",BLUE)
    d.card(1480,175,240,80,"ECS Fargate","Revision + rollback","fargate",BLUE)
    d.card(1200,335,220,80,"Private S3","Assets → HTML","s3",GREEN)
    d.card(1480,335,240,80,"CloudFront","Static + API","cloudfront",PURPLE)
    d.text(410,294,"No long-lived AWS access keys",17,MUTED)
    d.boundary(385,495,1365,130,"Operator-controlled infrastructure",GREEN,"#f5faf6")
    d.card(410,540,245,62,"Terraform","plan → review → apply",color=GREEN)
    d.line("M655 571 H745","green")
    d.card(745,540,290,62,"State in S3","Lockfile + versioning","s3",GREEN)
    d.line("M1035 571 H1130","green")
    d.card(1130,540,580,62,"VPC / ALB / ECS / RDS / ACM","Manual apply only · runtime config managed by Actions",color=GREEN)
    d.text(42,651,"runtime-config workflow: API smoke → LIVE / STATIC_DEMO · no image upload or ECS redeployment",17,MUTED)
    d.save("delivery-architecture")


def aiops():
    d=Diagram(1800,675,"Daily Briefing | Optional AIOps", "Code and Terraform are prepared · Disabled by default · AWS / AI / email end-to-end validation is pending")
    d.boundary(40,125,1710,470,"OPTIONAL MODULE · dashed boundary denotes planned activation",PURPLE,"#fcfaff",True)
    d.line("M355 235 H410 V300 H470","purple")
    d.line("M355 430 H410 V335 H470","purple")
    d.line("M800 280 H855 V220 H900","purple")
    d.line("M800 325 H860 V455 H1240","purple")
    d.text(890,442,"Rule-based fallback / notification",15,PURPLE,label=True)
    d.line("M800 305 H835 V285 H1210 V220 H1240","purple",True)
    d.text(945,282,"Masked evidence",14,PURPLE,label=True)
    d.line("M1480 220 H1510 V365 H820 V420 H730 V380","purple",True)
    d.text(1120,353,"Structured analysis / fallback",15,PURPLE,label=True)
    d.line("M1480 455 H1540","purple")
    d.card(70,190,285,90,"CloudWatch Logs","Backend ERROR events","cloudwatch",PURPLE)
    d.card(70,385,285,90,"EventBridge","ECS task / deploy failure","eventbridge",PURPLE)
    d.card(470,235,330,145,"Python Lambda","Parse → sanitize → classify","lambda",BLUE)
    d.text(492,440,"Outside the application VPC",16,MUTED)
    d.card(900,175,260,90,"DynamoDB","Dedup + daily limits","dynamodb",BLUE)
    d.card(1240,175,240,90,"AI API","Optional / bounded",color=PURPLE,dash=True)
    d.card(1240,410,240,90,"Amazon SNS","Korean notification","sns",PURPLE)
    d.card(1540,410,180,90,"Email","User confirms",color=INK)
    d.text(70,551,"No automatic infrastructure repair · AI failures use basic alerts · Lambda delivery failure has a separate CloudWatch alarm",17,MUTED)
    d.text(42,641,"Operational safety: sanitize logs before AI · daily call limits · duplicate suppression · no infrastructure mutation permissions",17,MUTED)
    d.save("aiops-architecture")


if __name__ == "__main__":
    cloud()
    delivery()
    aiops()
    print("Generated 3 self-contained SVG architecture diagrams.")
