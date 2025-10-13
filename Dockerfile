# 使用轻量版 Python 镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY app/requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制整个 app 文件夹
COPY app .

# 暴露端口
EXPOSE 8080

# 启动 Flask 应用
CMD ["python", "app.py"]
