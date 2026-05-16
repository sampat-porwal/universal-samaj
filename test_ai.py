from google import genai

# Apni Nayi API key yahan daalein
api_key = ""

print("Fetching available models from Google's Menu Card...\n")
try:
    client = genai.Client(api_key=api_key)
    
    # Sirf models ke naam print karega
    for model in client.models.list():
        print("👉", model.name)
            
    print("\n✅ Menu Card Downloaded!")
except Exception as e:
    print("❌ Error:", str(e))

