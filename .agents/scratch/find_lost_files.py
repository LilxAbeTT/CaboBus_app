import json
import os

log_path = r"C:\Users\larr_\.gemini\antigravity\brain\3422d422-c9af-4567-b1be-d24a754617e0\.system_generated\logs\transcript.jsonl"

found_files = {}

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            # Look for tool calls that might contain the file content
            if "tool_calls" in data:
                for call in data["tool_calls"]:
                    if call["function"]["name"] == "default_api:write_to_file":
                        args = json.loads(call["function"]["arguments"])
                        target_file = args.get("TargetFile", "")
                        if "HomePage.tsx" in target_file or "AppLayout.tsx" in target_file:
                            found_files[target_file] = args.get("CodeContent", "")
                    elif call["function"]["name"] == "default_api:replace_file_content" or call["function"]["name"] == "default_api:multi_replace_file_content":
                        args = json.loads(call["function"]["arguments"])
                        target_file = args.get("TargetFile", "")
                        if "HomePage.tsx" in target_file or "AppLayout.tsx" in target_file:
                            # Just log that it was modified, we might not get full content
                            print(f"File modified via replace: {target_file}")
            
            # Also check if it's a response with output (e.g. cat or type)
            if "content" in data and isinstance(data["content"], str):
                if "export function HomePage" in data["content"] or "export default function HomePage" in data["content"]:
                    # Might be a raw text dump
                    pass
        except Exception as e:
            pass

for k, v in found_files.items():
    print(f"--- FOUND SCRIPT FOR {k} ---")
    print(v[:500])
    print("...")

