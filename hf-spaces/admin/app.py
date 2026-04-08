import os

import gradio as gr

try:
    from openai import OpenAI
except Exception:  # pragma: no cover
    OpenAI = None

from context import DEFAULT_HINT, DOC_HINTS, INTRO

HF_MODEL = os.getenv("HF_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
HF_TOKEN = os.getenv("HF_TOKEN", "")


def build_messages(question: str):
    system_prompt = (
        "Eres el chatbot interno de admin de Kittypau. "
        "Respondes de forma breve, util y clara para Javo, Mauro y administradores. "
        "Usas la documentacion como fuente y siempre sugieres docs relevantes. "
        "No mezclas la experiencia cliente con la vista interna."
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]


def format_answer(title, docs, summary):
    docs_md = "\n".join(f"- `{doc}`" for doc in docs)
    return (
        f"### {title}\n"
        f"{INTRO}\n\n"
        f"**Resumen**\n"
        f"{summary}\n\n"
        f"**Docs sugeridos**\n"
        f"{docs_md}\n"
    )


def local_answer(question: str) -> str:
    text = (question or "").strip().lower()

    if not text:
        return "Escribe una pregunta corta sobre Kittypau."

    if any(word in text for word in ["hola", "buenas", "saludos"]):
        return "Hola. Soy el hero interno de admin. Pregunta por estado, bridge, bateria, finanzas, chatbot o despliegue."

    if any(word in text for word in ["estado", "avance", "status"]):
        return format_answer(
            "Estado del proyecto",
            DOC_HINTS["estado"],
            "Lo mas util ahora es revisar el estado vivo y el plan de mejora priorizado.",
        )

    if any(word in text for word in ["doc", "indice", "document", "readme"]):
        return format_answer(
            "Documentacion principal",
            DOC_HINTS["docs"],
            "INDEX.md y README.md son la entrada correcta para ubicar la pieza que buscas.",
        )

    if any(word in text for word in ["bridge", "mqtt", "raspberry"]):
        return format_answer(
            "Bridge y hardware",
            DOC_HINTS["bridge"],
            "Aqui deberias mirar healthcheck, estado actual y Raspberry Bridge.",
        )

    if any(word in text for word in ["bateria", "battery"]):
        return format_answer(
            "Bateria y telemetria",
            DOC_HINTS["bateria"],
            "La estimacion, el schema y las APIs relacionadas estan aqui.",
        )

    if any(word in text for word in ["finanza", "pago", "comprobante", "fondos"]):
        return format_answer(
            "Finanzas y respaldos",
            DOC_HINTS["finanzas"],
            "Los comprobantes y el radar vivo estan en la carpeta financiera.",
        )

    if any(word in text for word in ["chatbot", "gato", "admin"]):
        return format_answer(
            "Chatbots de Kittypau",
            DOC_HINTS["chatbot"],
            "Hay una linea separada para cliente y otra para admin.",
        )

    if any(word in text for word in ["deploy", "vercel", "supabase", "hf", "hugging"]):
        return format_answer(
            "Despliegue y CLI",
            DOC_HINTS["deploy"],
            "Vercel, Supabase y Hugging Face se cruzan aqui.",
        )

    return format_answer(
        "Consulta general",
        DEFAULT_HINT,
        "Si no encaja aun, INDEX.md y README.md suelen llevarte a la pieza correcta.",
    )


def answer(question):
    text = (question or "").strip()

    if HF_TOKEN and OpenAI is not None and text:
        try:
            client = OpenAI(
                base_url="https://router.huggingface.co/v1",
                api_key=HF_TOKEN,
            )
            completion = client.chat.completions.create(
                model=HF_MODEL,
                messages=build_messages(text),
            )
            reply = completion.choices[0].message.content
            if reply:
                return reply.strip()
        except Exception:
            pass

    return local_answer(text)


with gr.Blocks(title="Kittypau Admin Chatbot") as demo:
    gr.Markdown("# Kittypau Admin Chatbot\nHero interno simple para Javo, Mauro y administradores.")
    gr.Markdown(INTRO)
    with gr.Row():
        question = gr.Textbox(
            label="Pregunta interna",
            placeholder="Ej: Como va el bridge? / Donde esta la documentacion de bateria?",
            lines=2,
        )
    with gr.Row():
        ask = gr.Button("Consultar", variant="primary")
    result = gr.Markdown()

    ask.click(fn=answer, inputs=question, outputs=result)
    question.submit(fn=answer, inputs=question, outputs=result)

    gr.Markdown(
        "### Preguntas rapidas\n"
        "- estado del proyecto\n"
        "- documentacion principal\n"
        "- bridge y raspberry\n"
        "- bateria y telemetria\n"
        "- finanzas y comprobantes\n"
        "- chatbot visible de cliente"
    )


if __name__ == "__main__":
    demo.launch()
