FROM python:3.12-slim
WORKDIR /app
COPY services/ml/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY services/ml/src ./src
EXPOSE 4004
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4004"]
