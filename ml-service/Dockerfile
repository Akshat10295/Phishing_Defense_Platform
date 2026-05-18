FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Harden security: create non-root user and restrict privileges
RUN groupadd -r sentinel && \
    useradd -r -g sentinel -s /sbin/false sentinel && \
    chown -R sentinel:sentinel /app

USER sentinel

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app.main:app"]
