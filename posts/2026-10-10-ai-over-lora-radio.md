---
title: Asking an AI from a hill with no signal
date: 2026-10-10
summary: Can people with no mobile signal still ask an AI for help? I tested the idea in the UK with two £18 radios. Here is how it works, and what I learned.
tags: lora, meshtastic, llm, compression, off-grid, amazon bedrock, beekeeping, agritech, digital divide, radio
draft: false
image: /assets/posts/lora-llm/og.png
---

I think every idea needs a real reason to build it. This one starts with a simple fact. Many people still have no mobile signal where they live and work.

The ITU is the United Nations agency for telecoms. In 2024 it reported that 14% of people in Africa have no mobile broadband. In rural Africa, the figure is 25%. Think of a farmer far from the nearest mast. They have the most to gain from good advice, but they have no way to ask for it. They may need to know when the rain will come, what is wrong with a crop, or what a fair price is.

So I asked myself a question. Can a person talk to an AI with no internet and no phone signal at all?

I cannot test that in rural Africa from my house. But I can test it in the UK. Where I walk, my phone often shows no signal. So this project is a small local test of a bigger idea. If it works on a hill in England, it can work on a farm with no coverage.

The setup for a remote community would be simple. One radio goes on each farm. One base camp serves them all. Base camp can be in one of two places:

- **A village with no internet.** One good PC or small server can run an LLM locally. That one machine can give every farm in radio range access to the same knowledge.
- **A town with internet.** Base camp can connect to an LLM provider in the cloud. I work with AWS, so I use Amazon Bedrock. Other providers would also work.

The farmers do not need signal. Only base camp needs power and, in the second case, a connection.

The answer is yes. It is slow, but it works. This post tells you how.

## The idea

LoRa is a type of radio. It sends very small messages over long distances, often many kilometres. It uses very little power. It needs no phone network and no licence.

Meshtastic is free software for cheap LoRa radios. It lets the radios send text messages to each other. Each radio can also pass messages on for other radios, so they make a mesh.

My idea was simple:

1. I carry a small radio in my pocket. My phone connects to it with Bluetooth.
2. A second radio stays at home in the loft. It connects to my home server.
3. I type a question on my phone. It goes over the radio to the loft.
4. The server asks a large language model (LLM) the question.
5. The answer comes back over the radio to my phone.

I call the home end "base camp". The pocket radio is the "field radio".

![How it works. My question goes over LoRa radio to base camp at home. Base camp asks the LLM, and the answer comes back the same way.](/assets/posts/lora-llm/how-it-works.svg)

## How far does it reach?

This part amazed me. In my tests, a message got across Guildford. Guildford is a large, built-up town. Buildings, hills and trees are all in the way. LoRa still found a path.

In open country, the range is much greater. What matters most is line of sight: height beats power. A radio on a hill or a roof reaches much farther than the same radio in a street. The Meshtastic record for two radios on the ground is 331 km, from one mountain to another, on the same 868 MHz band that I use.

![Across a town, the signal bounces between buildings and still gets through. In the open, with line of sight, two radios have talked over 331 km.](/assets/posts/lora-llm/range.svg)

For remote farms this is good news. Open land and a base camp on high ground could cover a very large area.

## The problem: radio messages are tiny

One LoRa message can carry about 200 bytes. That is about two short sentences. A useful answer is often 100 to 200 words. As plain text, that needs many messages.

Each message also takes time on the air. Messages can get lost, so the radio must send some of them again. More messages means more waiting and more chances to fail.

### The law limits how long I can transmit

There is a second problem, and it is a hard rule. In the UK, LoRa uses a shared band near 868 MHz. Anyone can use it with no licence. To keep it fair, the rules limit how long each radio can transmit.

Meshtastic uses the part of the band from 869.4 to 869.65 MHz. There, a radio can transmit for only 10% of the time. That is 6 minutes in each hour. Meshtastic enforces this. It checks every minute over a rolling hour. When a radio reaches the limit, it stops sending until it is allowed again.

Six minutes sounds like a lot. It is not. With the default Meshtastic settings, one full message takes about 2 seconds on the air. A long answer as plain text needs 6 or more messages. Retries, acknowledgements and relays all use the same budget.

![The 10% rule gives each radio 6 minutes of airtime per hour. A compressed answer uses about a quarter of the airtime of the same answer as plain text. Airtime is my estimate for Meshtastic's LongFast settings.](/assets/posts/lora-llm/airtime.svg)

So small messages are not only faster. They also keep me inside the law. And on a busy mesh, they leave room for other people.

So I had to make the answers smaller. A lot smaller.

## Step 1: tell the AI to be brief

The first fix is cheap. I tell the model that every word costs airtime. The instructions say:

- Use short, plain sentences.
- Give facts and instructions only.
- Do not use greetings, apologies or filler.
- Do not use markdown, bullets or headings.

I also let the model choose the length. It starts each reply with a line like `PACKETS: 2`. That is its own guess of how many radio messages the answer needs, from 1 to 4. If the answer is much too long for its guess, base camp asks again.

## Step 2: compress with a small language model

Normal compression, like zip, does not help much with short text. It needs a lot of text to find patterns. On my real messages, zip made the text only 1.4 times smaller.

So I used a different method. I put a small language model at both ends of the link. The model is SmolLM2, with 360 million parameters. The file is about 386 MB, and my phone runs it.

### The neat trick: send the guess, not the word

This is the part I like most, so I will explain it slowly.

A language model does one thing. You give it some text, and it guesses what comes next. It does not make one guess. It makes a ranked list of every possible next word, with a chance for each one. (Strictly, it works in "tokens", which are words or parts of words. SmolLM2 knows 49,152 of them.)

Imagine I want to send this sentence: "After the walk I went back to my house."

The model reads "After the walk I went back to my" and makes its list. "car" is first. "room" is second. "house" is seventh.

Now the trick. I do not need to send the word "house". I can send the number 7. The other end has the same model. It reads the same words, makes the same list, and looks at place 7. It finds "house".

![The sender and the receiver make the same list of guesses. So the sender sends only the place of the right word in the list. (The words and percentages here are an example.)](/assets/posts/lora-llm/guess.svg)

A small number is much cheaper to send than a word. Most of the time the right word is near the top of the list, often in first place. So most words cost only a few bits. A rare word, like a place name, costs more. But rare words are rare.

The real codec is a little cleverer than a list of places. It uses a method called arithmetic coding. Arithmetic coding uses the chance of each word, not only its place. A word with a 50% chance costs 1 bit. A word with a 5% chance costs about 4 bits. A word the model is almost sure of costs much less than 1 bit. The word "house" as plain text costs 40 bits.

The receiver does the same steps in reverse. It decodes one word, adds it to the text, makes the next list, and decodes the next word. At the end it has the exact text, letter for letter. Nothing is lost.

:::note The important rule
Both ends must use the same model file, byte for byte. If one byte is different, the guesses are different, and the answer will not decode.
:::

The model also remembers the conversation so far. So each new message gets the earlier questions and answers as context. This makes the guesses better, and the messages smaller.

![On my real messages, the small language model made the text 4.1 times smaller. Zip made it only 1.4 times smaller.](/assets/posts/lora-llm/bytes.svg)

## Step 3: a link that does not give up

Radio is not reliable. So I built a small layer on top of Meshtastic. Each radio message has a 3-byte header:

- **Byte 1:** which message in the conversation this is.
- **Byte 2:** which part of the message this is, and how many parts there are.
- **Byte 3:** a checksum of the conversation so far. Both ends must agree on it.

If a part does not arrive, the receiver asks for that part by number. The sender then sends only that part again.

Base camp also does not wait for the full answer. It sends part 1 as soon as it is ready. While part 1 is in the air, it encodes part 2. My phone starts to show the answer before the rest arrives.

## The hardware

I wanted to keep the cost low. If the idea is for remote farmers, the kit must be cheap. So I used the most common Meshtastic board.

- **Board:** Heltec WiFi LoRa 32 V3. It has a LoRa radio, Wi-Fi, Bluetooth and a small screen.
- **Battery:** a small lithium battery for the pocket radio.
- **Case:** a 3D printed case.

![The Heltec V3 in its 3D printed case.](/assets/posts/lora-llm/heltec-v3.svg)

I bought it all on AliExpress. Each radio cost me about £18 with the battery and case. I used two radios, so the full radio kit cost about £36.

The base radio uses Wi-Fi to talk to my home server. The field radio uses Bluetooth to talk to my phone. Both are the same board.

## The pieces

| Part | What it does |
|---|---|
| Field radio | In my pocket. Talks to my phone with Bluetooth. |
| Phone app | A web app that works offline. It holds the small model and encodes and decodes messages. |
| Base radio | In the loft, on home Wi-Fi. |
| Base camp | A Docker container on my home server. It listens to the base radio, asks the LLM and sends the answer. |
| LLM | A model in the cloud on Amazon Bedrock. It can also search the web. |

The LLM can also search the web, but only when that helps to answer the question. One evening I was at my apiary, looking after my bees. I had to wait for dusk, when the bees are back in the hive. I asked when dusk was, and base camp searched for it. A model with no search cannot know that kind of local, current fact.

### Who can read the messages?

Radio is open. Anyone with a LoRa radio nearby can receive my messages. On a mesh, other people's radios also pass my messages on, from hop to hop, until they reach base camp. So I must assume that strangers carry every message.

Meshtastic solves this with encryption. Each radio has its own pair of keys: a public key that it shares, and a private key that it keeps. A direct message is locked with the keys of the sender and the receiver. The radios in between can pass it on, but they cannot read it. Only base camp can open my question, and only my field radio can open the answer.

Base camp also checks who is asking. It answers only radios that are on its list. Each radio on the list must use the public key that base camp saved for it the first time. If another radio pretends to be mine, its key will not match. So a stranger on the mesh can carry my messages, but cannot read them and cannot use my AI.

## Does it work?

Yes. Base camp records the size of every question and answer. Here are the results from my first 48 messages:

| Measure | Result |
|---|---|
| Text, as plain bytes | 10,944 B |
| Bytes sent on the air, with headers | 2,672 B |
| Smaller by | 4.1 times |
| Zip on the same text | 1.4 times smaller |
| Radio messages, plain text | 128 |
| Radio messages, compressed | 96 |
| Answers that would not fit in 4 messages as plain text | 3 |

Longer answers did well. One answer about my bees was 149 words. As plain text it needed 6 radio messages. Compressed, it needed 2. That is 4.7 times smaller.

### A day in the apiary

![In the apiary. There is no mobile signal, but the field radio on my belt reaches base camp.](/assets/posts/lora-llm/apiary.svg)

My apiary is a good test. There is no signal there. But sometimes I need one fact quickly, and the answer changes what I do next.

These are the kinds of questions a beekeeper asks in the apiary:

- Is it warm enough to open the hives this afternoon, or should I wait?
- When will the rain arrive? Do I have time to finish the inspection?
- How strong will the wind be in the next hour?
- What time is dusk today? I want to move a hive when the foragers are home.
- What is in flower near here now? Where are my bees likely to forage?
- What is this plant the bees are working so hard?

None of these are hard questions. But each one needs a fact about today, or about this place. Without signal, I cannot get it. With base camp, I can.

Here is an example. In October, in Surrey, I might see bees all over a plant at the edge of the field. I would ask:

> Small yellow-green flowers in round clusters, on a dark evergreen climber over a hedge. It is October and it is covered in bees. What is it?

An answer of the kind base camp sends would be:

> Ivy (Hedera helix). It flowers September to November and is the last big nectar and pollen source of the year in southern England. The bees are filling the hive for winter. Ivy honey sets hard and fast in the comb, so take any honey off before the ivy flow, or it may be hard to extract.

It is short and practical. It tells me what the plant is, why it matters to my bees and what to do about it. A farmer far from a mast needs the same kind of answer about their crops and animals.

## What did not go well

**Very short messages get bigger.** I sent "Ping" many times to test the link. Four letters of plain text went out as 17 or 18 bytes. The header and the model's start-up cost are larger than the word. For tiny messages, plain text would be better. I have not fixed this yet.

**The home server is slow.** My home server is a small, cheap box under the stairs. It does not have much power. The codec must run the small model once for each token, and on this box that takes time. On one CPU thread it needs about 0.35 seconds for each token, so a long answer takes minutes. A build that uses 6 CPU threads made this 3.6 times faster. Sending part 1 early also helps a lot. A normal desktop PC would be much faster.

## What I learned

- A small model that both ends share is a very good compressor for short chat. It beat zip by about 3 times on my messages.
- The cheapest saving is in the instructions. A model that writes less sends less.
- Send each part as soon as it is ready. Waiting for the full answer feels much slower than it is.
- Field tests find problems that desk tests do not. Go outside and test it on a real hill.

## Why it matters

I built this on a hill in England, but England is not the point. For me it was a test. The real question is whether good knowledge can reach the people who are farthest from a mast.

I think the answer is yes. Two radios cost me about £36. The phone does the hard work of decoding. One base camp can serve a whole valley. A farmer in the field could ask whether rain will come before the harvest is in, what a pest on the crop is, or what the market price is today, and get a clear answer in a minute or two. The farmer needs no signal and pays no data bill.

But the main idea works. A large AI can answer a question in a few hundred bytes. And a few hundred bytes can travel a long way.

:::clay The code
I will share the code on GitHub when I have tidied it up. I will add the link here.
:::

If you build something like this, or you work with remote farming communities, I would like to hear from you.
