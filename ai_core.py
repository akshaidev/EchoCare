# ai_core.py
import os
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

MODEL_NAME = "microsoft/phi-3-mini-4k-instruct"  # phi-3-mini instruct variant

print("🔹 Loading local model:", MODEL_NAME)

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)

# try to load quantized to fit VRAM
from transformers import BitsAndBytesConfig

# Quantization + offload config
bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_enable_fp32_cpu_offload=True,   # offload large layers to CPU if needed
)

model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    quantization_config=bnb_config,
    dtype=torch.float16,
    low_cpu_mem_usage=True
)


llm_pipe = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    device_map="auto"
)

def get_ai_response(user_input: str, context: str = "") -> str:
    system_prompt = (
        "You are EchoCare, a warm, empathetic companion for students. "
        "Be concise, kind, and give short calming advice or a simple actionable suggestion. "
    )
    prompt = f"{system_prompt}\nContext: {context}\nUser: {user_input}\nEcho Care:"
    out = llm_pipe(prompt, max_new_tokens=140, do_sample=True, temperature=0.7)
    text = out[0]["generated_text"]
    # extract portion after "Echo Care:" if present
    if "Echo Care:" in text:
        return text.split("Echo Care:")[-1].strip()
    return text.strip()
