import json
import os
from typing import Dict, Any
from groq import Groq

# Hardcoded configurations
MAX_TURNS = 5  # 5 turns = 5 user messages + 5 assistant messages
SYSTEM_PROMPT = "You are a friendly AI calling for an AskEm testing conversation, lasting about 3 minutes.When the user says hello, introduce yourself by saying this is an AskEm testing call, then ask how their day is going.Naturally ask their name and what they do, one question at a time, and respond naturally to their answers.Keep responses casual, and human-like; use their answers to keep the conversation going instead of following a fixed questionnaire.Toward the end, ask briefly how natural the conversation felt and if they have any feedback."

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    # 1. Extract session state and input 
    session_state = event.get("sessionState", {})
    session_attributes = session_state.get("sessionAttributes") or {}
    # FORCE BARGE-IN: Allow the caller to interrupt the AI mid-sentence
    session_attributes["x-amz-lex:allow-interrupt:*:*"] = "true"
    # CUT-OFF LATENCY: Reduce end-of-speech silence detection from 600ms to 300ms
    session_attributes["x-amz-lex:audio:end-timeout-ms:*:*"] = "300"
    input_transcript = event.get("inputTranscript", "").strip()
    
    intent = session_state.get("intent", {})
    intent_name = intent.get("name", "FallbackIntent")
    
    # 2. Extract and parse the sliding window history
    history_str = session_attributes.get("history", "[]")
    try:
        history = json.loads(history_str)
    except json.JSONDecodeError:
        history = []
        
    # 3. Append the new user input
    if input_transcript:
        history.append({"role": "user", "content": input_transcript})
    else:
        # Failsafe for Connect's empty initial payload connection
        history.append({"role": "user", "content": "Hello"})
        
    # 4. Enforce sliding window to protect Lex's 12 KB payload limit
    if len(history) > MAX_TURNS * 2:
        history = history[-(MAX_TURNS * 2):]
        
    # Prepend the persona prompt before execution
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
    
    # 5. Execute Groq API
    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    print(f"User Input: {input_transcript}")
    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="openai/gpt-oss-120b",
            max_tokens=2048,
            temperature=0.7
        )
        groq_response = chat_completion.choices[0].message.content
        print(f"Groq Output: {groq_response}")
    except Exception as e:
        print(f"Groq API Error: {e}")
        groq_response = "I'm having trouble connecting to my brain right now."
        
    # 6. Append the LLM's response to the memory array
    history.append({"role": "assistant", "content": groq_response})
    
    # Update Lex session attributes with the stringified history
    session_attributes["history"] = json.dumps(history)
    
    # 7. Return exact Lex V2 compliant fulfillment payload
    return {
        "sessionState": {
            "sessionAttributes": session_attributes,
            "dialogAction": {
                "type": "ElicitIntent"
            },
            "intent": {
                "name": intent_name,
                "state": "InProgress"
            }
        },
        "messages": [
            {
                "contentType": "PlainText",
                "content": groq_response
            }
        ]
    }