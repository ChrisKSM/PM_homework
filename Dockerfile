FROM python:3.12.13

WORKDIR /usr/app/src

RUN apt-get update \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*

ENV UV_INDEX_URL="https://nexus.hedej.lge.com/repository/pypi-group/simple"
# uv
RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./

# venv path
ARG VENV_PATH=/usr/app/src/venv
RUN python3 -m venv ${VENV_PATH}

ENV VIRTUAL_ENV="${VENV_PATH}"
ENV UV_PROJECT_ENVIRONMENT="${VENV_PATH}"
ENV PATH="${VENV_PATH}/bin:${PATH}"
ENV VIRTUAL_ENV_PROMPT=venv

RUN uv sync --frozen --no-dev
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]