import os

import gradio as gr

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None

from context import CANONICAL_PERSONALITY, DEFAULT_REPLY, FEWSHOT_EXAMPLES, PRODUCT_CONTEXT, TOPIC_REPLIES

HF_MODEL = os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
HF_TOKEN = os.getenv("HF_TOKEN", "")


def build_messages(message: str, history: list[tuple[str, str]]):
    system_prompt = (
        "Eres el gato de Kittypau. Hablas en espanol, con sarcasmo suave, tono felino y respuestas breves. "
        "Tu forma de pensar es estructurada, precisa y obsesionada con el orden. "
        "Corriges imprecisiones con calma, desprecias lo irrelevante y vuelves siempre a Kittypau. "
        "Los ejemplos son guia semantica, no frases para copiar literalmente. "
        "Solo hablas de login, demo, inicio, mascota, soluciones para el cliente e Instagram. "
        "No inventes arquitectura interna ni temas de admin. "
        "Si la pregunta es ambigua, corrige primero y luego responde. "
        "Si la pregunta no tiene que ver con la app o la mascota, rechaza de forma seca y breve. "
        "Contexto real: login captura nombre, mascota y correo; demo muestra el hero con datos del usuario; inicio orienta rapido. "
        f"Caracter canonico: {CANONICAL_PERSONALITY['style']}. "
        f"Modo logico: {CANONICAL_PERSONALITY['logic']}. "
        f"Formas de trato: {', '.join(CANONICAL_PERSONALITY['address'])}. "
        f"Palabras prohibidas: {', '.join(CANONICAL_PERSONALITY['never_use'])}. "
        f"Objetivo real del producto: {PRODUCT_CONTEXT['purpose']}. "
        f"Propuesta de valor: {PRODUCT_CONTEXT['value']}. "
        f"Creadores: {PRODUCT_CONTEXT['creators']}"
    )
    messages = [{"role": "system", "content": system_prompt}]
    for user_msg, assistant_msg in FEWSHOT_EXAMPLES:
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": assistant_msg})
    for user_msg, assistant_msg in history[-4:]:
        messages.append({"role": "user", "content": user_msg})
        messages.append({"role": "assistant", "content": assistant_msg})
    messages.append({"role": "user", "content": message})
    return messages


def local_reply(text: str) -> str:
    if any(word in text for word in ["hola", "buenas", "saludos", "miau"]):
        return "Miau. Soy tu guia felina de Kittypau. Preguntame por login, demo o tu mascota."

    if any(word in text for word in ["login", "registro", "correo", "nombre"]):
        return "Login captura tus datos. Si, era eso. Luego la demo usa ese contexto."

    if any(word in text for word in ["demo app", "demo", "hero", "pantalla", "modo prueba"]):
        return "La demo explica la pantalla y ordena la informacion. Mira arriba."

    if any(word in text for word in ["mascota", "perro", "gato", "comida", "agua", "hidrat", "bateria"]):
        return TOPIC_REPLIES["mascota"]

    if any(word in text for word in ["instagram", "seguir", "seguirnos", "redes"]):
        return TOPIC_REPLIES["instagram"]

    if any(word in text for word in ["solucion", "sirve", "ayuda"]):
        return TOPIC_REPLIES["solucion"]

    if any(word in text for word in ["inicio", "bienvenida"]):
        return TOPIC_REPLIES["inicio"]

    if any(word in text for word in ["hero", "titular"]):
        return TOPIC_REPLIES["hero"]

    return DEFAULT_REPLY


def respond(message, history):
    text = (message or "").strip()
    normalized = text.lower()

    if HF_TOKEN and OpenAI is not None:
        try:
            client = OpenAI(
                base_url="https://router.huggingface.co/v1",
                api_key=HF_TOKEN,
            )
            completion = client.chat.completions.create(
                model=HF_MODEL,
                messages=build_messages(text, history or []),
            )
            reply = completion.choices[0].message.content
            if reply:
                return reply.strip()
        except Exception:
            pass

    return local_reply(normalized)


with gr.Blocks(title="Kittypau Chatbot Gato") as demo:
    gr.Markdown("# Kittypau Chatbot Gato\nGuia felina para clientes de Kittypau.")
    gr.ChatInterface(
        fn=respond,
        examples=[
            "Como uso la demo?",
            "Que hace la app por mi mascota?",
            "Donde veo el hero con mis datos?",
            "Que pasa en login?",
            "Para que sirve Kittypau?",
        ],
        chatbot=gr.Chatbot(height=420),
        title="",
        description="",
    )


if __name__ == "__main__":
    demo.launch()
