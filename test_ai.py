# from google import genai  # 👈 YEH NAYI LINE SABSE IMPORTANT HAI

# # Yahan apni fresh API key paste karein
# api_key = "" 

# print("Testing NEW Gemini API (google-genai)...")
# try:
#     # Naye package mein Client aise banta hai
#     client = genai.Client(api_key=api_key)
    
#     response = client.models.generate_content(
#         model='gemini-1.5-flash',
#         contents='Say hello in one word.'
#     )
#     print("✅ SUCCESS! AI Reply:", response.text)
# except Exception as e:
#     print("❌ FAILED! Error:", str(e))

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