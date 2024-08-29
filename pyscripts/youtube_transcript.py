# %%
from youtube_transcript_api import YouTubeTranscriptApi

video_id = "yf1xUGmCkpk"
transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["ja"])
print(transcript)
# %%
from youtube_transcript_api.formatters import WebVTTFormatter

formatted = WebVTTFormatter().format_transcript(transcript)
print(formatted)
# %%
from youtube_transcript_api.formatters import TextFormatter

formatted = TextFormatter().format_transcript(transcript)
print(formatted)
# %%
