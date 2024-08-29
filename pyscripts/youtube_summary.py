# %%
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

url = "https://www.youtube.com/watch?v=knjjJOTjvAI"

def extract_video_id(url):
    # Extract the video ID from the URL
    video_id = url.split('=')[-1]
    return video_id

print(extract_video_id(url))
# %%
video_id = extract_video_id(url)
transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["ja"])
formatter = TextFormatter()
transcript_text = formatter.format_transcript(transcript)
# %%
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# %%
from utils.toml_loader import TomlLoader

config = TomlLoader().load("../prompts/youtube_summary.toml")
print(config)

# %%
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": config["system_prompt"]},
        {"role": "user", "content": transcript_text}
    ],
    max_tokens=16000,
)
# %%
print(response.choices[0].message.content)
# %%
