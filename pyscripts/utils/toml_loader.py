# %%
from tomllib import loads

class TomlLoader:
    def load(self, toml_file: str) -> dict:
        with open(toml_file, encoding="utf-8") as f:
            return loads(f.read())
# %%
