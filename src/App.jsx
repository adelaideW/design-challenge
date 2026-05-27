import { useState, useRef, useEffect } from "react";

// ─── MOCK INTERVIEW ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior design interviewer conducting a live design challenge session. You are warm but professional, and your goal is to evaluate the candidate's design thinking process — not just their final output.

You will:
1. Start by presenting ONE clear design challenge prompt (keep it realistic, like something from a fintech, SaaS, or consumer app company). Pick from variety: redesign a flow, design a new feature, solve a specific user problem.
2. Wait for the candidate to respond. Evaluate whether they ask clarifying questions before diving in.
3. Answer their clarifying questions thoughtfully, like a real PM or lead designer would.
4. When they start presenting ideas, probe them with follow-up questions like:
   - "Why did you make that choice?"
   - "What would a user who's less tech-savvy think of that?"
   - "How does this connect to the business goal?"
   - "What would you cut if you only had time for one thing?"
5. Push back on at least one decision to test how they handle critique. Don't be harsh — be curious.
6. After they've presented their solution, give honest, specific feedback on:
   - Their process (did they clarify before designing?)
   - Their communication (did they narrate their thinking?)
   - Their design rationale (did they connect decisions to user/business goals?)
   - How they handled pushback
   - One key thing to improve

Keep responses concise. One message at a time. Never give the full challenge and all instructions at once — let it unfold naturally like a real interview.

Start by briefly introducing yourself and presenting the design challenge. Be direct and realistic.`;

const challenges = [
  "Redesign the onboarding flow for a B2B accounting tool — users are dropping off before completing setup.",
  "Design a feature that helps users of a budgeting app understand why they went over budget last month.",
  "A SaaS project management tool wants to add an AI assistant. Design how it surfaces suggestions without disrupting the user's workflow.",
  "Design an empty state for a new user's dashboard on a financial analytics platform.",
  "Redesign the notification settings for a mobile banking app — users report feeling overwhelmed by alerts.",
];

const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

const ASCII_CHARS = "01<>{}[]|\\/-+*=~^%$#@!?";
function buildAsciiGrid(cols, rows) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () =>
      ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)]
    ).join(" ")
  ).join("\n");
}
const ASCII_GRID = buildAsciiGrid(52, 18);

// ─── JOBS DATA ───────────────────────────────────────────────────────────────

// URL convention: link directly to the company's design jobs ATS page or filtered search,
// NOT generic career homepages. Solara Talent roles link to jobs.solaratalent.com/roles.
const JOBS = [
  // ── Anthropic (Greenhouse) ──
  { id: 1,   company: "Anthropic",        logo: "https://www.google.com/s2/favicons?sz=64&domain=anthropic.com",        role: "Product Designer, Trust & Safety",              location: "San Francisco, CA",  area: "AI Safety",           posted: "1d ago",   url: "https://boards.greenhouse.io/anthropic" },
  { id: 2,   company: "Anthropic",        logo: "https://www.google.com/s2/favicons?sz=64&domain=anthropic.com",        role: "Senior UX Designer, Claude Products",           location: "San Francisco, CA",  area: "AI Safety",           posted: "3d ago",   url: "https://boards.greenhouse.io/anthropic" },
  { id: 3,   company: "Anthropic",        logo: "https://www.google.com/s2/favicons?sz=64&domain=anthropic.com",        role: "Design Systems Lead",                           location: "San Francisco, CA",  area: "AI Safety",           posted: "18d ago",  url: "https://boards.greenhouse.io/anthropic" },
  { id: 4,   company: "Anthropic",        logo: "https://www.google.com/s2/favicons?sz=64&domain=anthropic.com",        role: "UX Researcher, Evaluations",                    location: "Remote",             area: "AI Safety",           posted: "42d ago",  url: "https://boards.greenhouse.io/anthropic" },
  // ── OpenAI (Ashby) ──
  { id: 5,   company: "OpenAI",           logo: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",           role: "Product Designer, ChatGPT",                     location: "San Francisco, CA",  area: "AI Research",         posted: "2d ago",   url: "https://jobs.ashbyhq.com/openai" },
  { id: 6,   company: "OpenAI",           logo: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",           role: "Staff Product Designer, Enterprise",            location: "Remote",             area: "AI Research",         posted: "5d ago",   url: "https://jobs.ashbyhq.com/openai" },
  { id: 7,   company: "OpenAI",           logo: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",           role: "Senior UX Researcher",                          location: "San Francisco, CA",  area: "AI Research",         posted: "14d ago",  url: "https://jobs.ashbyhq.com/openai" },
  { id: 8,   company: "OpenAI",           logo: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",           role: "Design Systems Designer",                       location: "San Francisco, CA",  area: "AI Research",         posted: "29d ago",  url: "https://jobs.ashbyhq.com/openai" },
  { id: 9,   company: "OpenAI",           logo: "https://www.google.com/s2/favicons?sz=64&domain=openai.com",           role: "Product Designer, Voice & Audio UX",            location: "San Francisco, CA",  area: "AI Research",         posted: "55d ago",  url: "https://jobs.ashbyhq.com/openai" },
  // ── Google ──
  { id: 10,  company: "Google",           logo: "https://www.google.com/s2/favicons?sz=64&domain=google.com",           role: "UX Designer, Google AI",                        location: "Mountain View, CA",  area: "Big Tech",            posted: "3d ago",   url: "https://careers.google.com/jobs/results/?q=UX+Designer&employment_type=FULL_TIME" },
  { id: 11,  company: "Google",           logo: "https://www.google.com/s2/favicons?sz=64&domain=google.com",           role: "Senior UX Designer, Search",                    location: "New York, NY",       area: "Big Tech",            posted: "11d ago",  url: "https://careers.google.com/jobs/results/?q=UX+Designer&employment_type=FULL_TIME" },
  { id: 12,  company: "Google",           logo: "https://www.google.com/s2/favicons?sz=64&domain=google.com",           role: "Interaction Designer, Gemini",                  location: "Mountain View, CA",  area: "Big Tech",            posted: "22d ago",  url: "https://careers.google.com/jobs/results/?q=Interaction+Designer&employment_type=FULL_TIME" },
  { id: 13,  company: "Google",           logo: "https://www.google.com/s2/favicons?sz=64&domain=google.com",           role: "UX Researcher, Android",                        location: "Seattle, WA",        area: "Big Tech",            posted: "38d ago",  url: "https://careers.google.com/jobs/results/?q=UX+Researcher&employment_type=FULL_TIME" },
  { id: 14,  company: "Google",           logo: "https://www.google.com/s2/favicons?sz=64&domain=google.com",           role: "Visual Designer, Brand Studio",                 location: "New York, NY",       area: "Big Tech",            posted: "67d ago",  url: "https://careers.google.com/jobs/results/?q=Visual+Designer&employment_type=FULL_TIME" },
  // ── Meta ──
  { id: 15,  company: "Meta",             logo: "https://www.google.com/s2/favicons?sz=64&domain=meta.com",             role: "Product Designer, Reality Labs",                location: "Menlo Park, CA",     area: "Big Tech",            posted: "4d ago",   url: "https://www.metacareers.com/jobs?teams[0]=Design" },
  { id: 16,  company: "Meta",             logo: "https://www.google.com/s2/favicons?sz=64&domain=meta.com",             role: "Senior Product Designer, Instagram",            location: "New York, NY",       area: "Big Tech",            posted: "13d ago",  url: "https://www.metacareers.com/jobs?teams[0]=Design" },
  { id: 17,  company: "Meta",             logo: "https://www.google.com/s2/favicons?sz=64&domain=meta.com",             role: "UX Researcher, WhatsApp",                       location: "Menlo Park, CA",     area: "Big Tech",            posted: "31d ago",  url: "https://www.metacareers.com/jobs?teams[0]=UX+Research+-+Product" },
  { id: 18,  company: "Meta",             logo: "https://www.google.com/s2/favicons?sz=64&domain=meta.com",             role: "Motion Designer, Threads",                      location: "New York, NY",       area: "Big Tech",            posted: "49d ago",  url: "https://www.metacareers.com/jobs?teams[0]=Design" },
  // ── Apple ──
  { id: 19,  company: "Apple",            logo: "https://www.google.com/s2/favicons?sz=64&domain=apple.com",            role: "UX Designer, Apple Intelligence",               location: "Cupertino, CA",      area: "Big Tech",            posted: "6d ago",   url: "https://jobs.apple.com/en-us/search#q=designer&sortby=newest" },
  { id: 20,  company: "Apple",            logo: "https://www.google.com/s2/favicons?sz=64&domain=apple.com",            role: "Product Designer, Health",                      location: "Cupertino, CA",      area: "Big Tech",            posted: "20d ago",  url: "https://jobs.apple.com/en-us/search#q=product+designer&sortby=newest" },
  { id: 21,  company: "Apple",            logo: "https://www.google.com/s2/favicons?sz=64&domain=apple.com",            role: "Interaction Designer, visionOS",                location: "Cupertino, CA",      area: "Big Tech",            posted: "44d ago",  url: "https://jobs.apple.com/en-us/search#q=interaction+designer&sortby=newest" },
  // ── Microsoft ──
  { id: 22,  company: "Microsoft",        logo: "https://www.google.com/s2/favicons?sz=64&domain=microsoft.com",        role: "Principal Designer, Copilot",                   location: "Redmond, WA",        area: "Big Tech",            posted: "7d ago",   url: "https://jobs.microsoft.com/en-us/search?q=product+designer" },
  { id: 23,  company: "Microsoft",        logo: "https://www.google.com/s2/favicons?sz=64&domain=microsoft.com",        role: "Senior UX Designer, Azure AI",                  location: "Remote",             area: "Big Tech",            posted: "16d ago",  url: "https://jobs.microsoft.com/en-us/search?q=UX+designer" },
  { id: 24,  company: "Microsoft",        logo: "https://www.google.com/s2/favicons?sz=64&domain=microsoft.com",        role: "Design Systems Researcher",                     location: "Redmond, WA",        area: "Big Tech",            posted: "58d ago",  url: "https://jobs.microsoft.com/en-us/search?q=design+researcher" },
  // ── Figma (Greenhouse) ──
  { id: 25,  company: "Figma",            logo: "https://www.google.com/s2/favicons?sz=64&domain=figma.com",            role: "Product Designer, AI Features",                 location: "San Francisco, CA",  area: "Design Tools",        posted: "1d ago",   url: "https://boards.greenhouse.io/figma" },
  { id: 26,  company: "Figma",            logo: "https://www.google.com/s2/favicons?sz=64&domain=figma.com",            role: "UX Researcher, Growth",                         location: "New York, NY",       area: "Design Tools",        posted: "4d ago",   url: "https://boards.greenhouse.io/figma" },
  { id: 27,  company: "Figma",            logo: "https://www.google.com/s2/favicons?sz=64&domain=figma.com",            role: "Senior Product Designer, Prototyping",          location: "San Francisco, CA",  area: "Design Tools",        posted: "19d ago",  url: "https://boards.greenhouse.io/figma" },
  { id: 28,  company: "Figma",            logo: "https://www.google.com/s2/favicons?sz=64&domain=figma.com",            role: "Staff Designer, Design Systems",                location: "Remote",             area: "Design Tools",        posted: "47d ago",  url: "https://boards.greenhouse.io/figma" },
  // ── Stripe ──
  { id: 29,  company: "Stripe",           logo: "https://www.google.com/s2/favicons?sz=64&domain=stripe.com",           role: "Product Designer, Payments UX",                 location: "San Francisco, CA",  area: "Fintech",             posted: "2d ago",   url: "https://stripe.com/jobs/search?teams=Design" },
  { id: 30,  company: "Stripe",           logo: "https://www.google.com/s2/favicons?sz=64&domain=stripe.com",           role: "Design Systems Engineer",                       location: "Remote",             area: "Fintech",             posted: "8d ago",   url: "https://stripe.com/jobs/search?teams=Design" },
  { id: 31,  company: "Stripe",           logo: "https://www.google.com/s2/favicons?sz=64&domain=stripe.com",           role: "Senior UX Designer, Radar",                     location: "Dublin",             area: "Fintech",             posted: "27d ago",  url: "https://stripe.com/jobs/search?teams=Design" },
  { id: 32,  company: "Stripe",           logo: "https://www.google.com/s2/favicons?sz=64&domain=stripe.com",           role: "UX Researcher, Merchants",                      location: "New York, NY",       area: "Fintech",             posted: "61d ago",  url: "https://stripe.com/jobs/search?teams=Design" },
  // ── Notion (Greenhouse) ──
  { id: 33,  company: "Notion",           logo: "https://www.google.com/s2/favicons?sz=64&domain=notion.so",            role: "Product Designer, Core Editor",                 location: "San Francisco, CA",  area: "Productivity",        posted: "3d ago",   url: "https://boards.greenhouse.io/notion" },
  { id: 34,  company: "Notion",           logo: "https://www.google.com/s2/favicons?sz=64&domain=notion.so",            role: "UX Designer, AI Integration",                   location: "New York, NY",       area: "Productivity",        posted: "7d ago",   url: "https://boards.greenhouse.io/notion" },
  { id: 35,  company: "Notion",           logo: "https://www.google.com/s2/favicons?sz=64&domain=notion.so",            role: "Senior Product Designer, Enterprise",           location: "San Francisco, CA",  area: "Productivity",        posted: "33d ago",  url: "https://boards.greenhouse.io/notion" },
  { id: 130, company: "Notion",           logo: "https://www.google.com/s2/favicons?sz=64&domain=notion.so",            role: "Design Lead, Templates",                        location: "San Francisco, CA",  area: "Productivity",        posted: "78d ago",  url: "https://boards.greenhouse.io/notion" },
  // ── Perplexity (Ashby) ──
  { id: 36,  company: "Perplexity",       logo: "https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai",        role: "Product Designer, Search UX",                   location: "San Francisco, CA",  area: "AI Search",           posted: "1d ago",   url: "https://jobs.ashbyhq.com/perplexity" },
  { id: 37,  company: "Perplexity",       logo: "https://www.google.com/s2/favicons?sz=64&domain=perplexity.ai",        role: "Senior Designer, Mobile",                       location: "San Francisco, CA",  area: "AI Search",           posted: "24d ago",  url: "https://jobs.ashbyhq.com/perplexity" },
  // ── Cursor (Ashby — Anysphere) ──
  { id: 38,  company: "Cursor",           logo: "https://www.google.com/s2/favicons?sz=64&domain=cursor.sh",            role: "Product Designer, Developer Experience",        location: "San Francisco, CA",  area: "Developer Tools",     posted: "2d ago",   url: "https://jobs.ashbyhq.com/anysphere" },
  { id: 39,  company: "Cursor",           logo: "https://www.google.com/s2/favicons?sz=64&domain=cursor.sh",            role: "UX Researcher",                                 location: "San Francisco, CA",  area: "Developer Tools",     posted: "36d ago",  url: "https://jobs.ashbyhq.com/anysphere" },
  // ── Vercel ──
  { id: 40,  company: "Vercel",           logo: "https://www.google.com/s2/favicons?sz=64&domain=vercel.com",           role: "Senior Product Designer",                       location: "Remote",             area: "Developer Tools",     posted: "2d ago",   url: "https://vercel.com/careers#open-positions" },
  { id: 41,  company: "Vercel",           logo: "https://www.google.com/s2/favicons?sz=64&domain=vercel.com",           role: "Design Engineer",                               location: "Remote",             area: "Developer Tools",     posted: "21d ago",  url: "https://vercel.com/careers#open-positions" },
  { id: 42,  company: "Vercel",           logo: "https://www.google.com/s2/favicons?sz=64&domain=vercel.com",           role: "UX Designer, Dashboard",                        location: "Remote",             area: "Developer Tools",     posted: "52d ago",  url: "https://vercel.com/careers#open-positions" },
  // ── Linear (Ashby) ──
  { id: 43,  company: "Linear",           logo: "https://www.google.com/s2/favicons?sz=64&domain=linear.app",           role: "Product Designer",                              location: "Remote",             area: "Project Management",  posted: "6d ago",   url: "https://jobs.ashbyhq.com/linear" },
  { id: 44,  company: "Linear",           logo: "https://www.google.com/s2/favicons?sz=64&domain=linear.app",           role: "Senior UX Designer",                            location: "Remote",             area: "Project Management",  posted: "40d ago",  url: "https://jobs.ashbyhq.com/linear" },
  { id: 131, company: "Linear",           logo: "https://www.google.com/s2/favicons?sz=64&domain=linear.app",           role: "UX Researcher",                                 location: "Remote",             area: "Project Management",  posted: "79d ago",  url: "https://jobs.ashbyhq.com/linear" },
  // ── Runway (Ashby) ──
  { id: 45,  company: "Runway",           logo: "https://www.google.com/s2/favicons?sz=64&domain=runwayml.com",         role: "Senior Product Designer, Video AI",             location: "New York, NY",       area: "Generative AI",       posted: "6d ago",   url: "https://jobs.ashbyhq.com/runway" },
  { id: 46,  company: "Runway",           logo: "https://www.google.com/s2/favicons?sz=64&domain=runwayml.com",         role: "Product Designer, Creative Tools",              location: "New York, NY",       area: "Generative AI",       posted: "28d ago",  url: "https://jobs.ashbyhq.com/runway" },
  // ── Midjourney ──
  { id: 47,  company: "Midjourney",       logo: "https://www.google.com/s2/favicons?sz=64&domain=midjourney.com",       role: "UX Designer",                                   location: "San Francisco, CA",  area: "Generative AI",       posted: "4d ago",   url: "https://www.midjourney.com/jobs" },
  { id: 48,  company: "Midjourney",       logo: "https://www.google.com/s2/favicons?sz=64&domain=midjourney.com",       role: "Product Designer, Web App",                     location: "San Francisco, CA",  area: "Generative AI",       posted: "53d ago",  url: "https://www.midjourney.com/jobs" },
  // ── Framer (Lever) ──
  { id: 49,  company: "Framer",           logo: "https://www.google.com/s2/favicons?sz=64&domain=framer.com",           role: "Product Designer, AI",                          location: "Amsterdam",          area: "Design Tools",        posted: "1d ago",   url: "https://jobs.lever.co/framer" },
  { id: 50,  company: "Framer",           logo: "https://www.google.com/s2/favicons?sz=64&domain=framer.com",           role: "Design Engineer",                               location: "Amsterdam",          area: "Design Tools",        posted: "35d ago",  url: "https://jobs.lever.co/framer" },
  // ── Webflow (Lever) ──
  { id: 51,  company: "Webflow",          logo: "https://www.google.com/s2/favicons?sz=64&domain=webflow.com",          role: "Senior Product Designer",                       location: "Remote",             area: "No-code / Web",       posted: "2d ago",   url: "https://jobs.lever.co/webflow" },
  { id: 52,  company: "Webflow",          logo: "https://www.google.com/s2/favicons?sz=64&domain=webflow.com",          role: "UX Researcher, Platform",                       location: "San Francisco, CA",  area: "No-code / Web",       posted: "17d ago",  url: "https://jobs.lever.co/webflow" },
  { id: 53,  company: "Webflow",          logo: "https://www.google.com/s2/favicons?sz=64&domain=webflow.com",          role: "Product Designer, CMS",                         location: "Remote",             area: "No-code / Web",       posted: "66d ago",  url: "https://jobs.lever.co/webflow" },
  // ── Miro (Greenhouse) ──
  { id: 54,  company: "Miro",             logo: "https://www.google.com/s2/favicons?sz=64&domain=miro.com",             role: "Product Designer, Collaboration",               location: "Amsterdam",          area: "Collaboration",       posted: "2d ago",   url: "https://boards.greenhouse.io/mirohq" },
  { id: 55,  company: "Miro",             logo: "https://www.google.com/s2/favicons?sz=64&domain=miro.com",             role: "UX Researcher",                                 location: "San Francisco, CA",  area: "Collaboration",       posted: "9d ago",   url: "https://boards.greenhouse.io/mirohq" },
  { id: 56,  company: "Miro",             logo: "https://www.google.com/s2/favicons?sz=64&domain=miro.com",             role: "Staff Designer, AI Features",                   location: "Amsterdam",          area: "Collaboration",       posted: "48d ago",  url: "https://boards.greenhouse.io/mirohq" },
  // ── Mistral AI (Lever) ──
  { id: 57,  company: "Mistral AI",       logo: "https://www.google.com/s2/favicons?sz=64&domain=mistral.ai",           role: "Product Designer",                              location: "Paris",              area: "AI Research",         posted: "3d ago",   url: "https://jobs.lever.co/mistral" },
  { id: 58,  company: "Mistral AI",       logo: "https://www.google.com/s2/favicons?sz=64&domain=mistral.ai",           role: "UX Designer, Developer Platform",               location: "Paris",              area: "AI Research",         posted: "41d ago",  url: "https://jobs.lever.co/mistral" },
  // ── Replicate (Ashby) ──
  { id: 59,  company: "Replicate",        logo: "https://www.google.com/s2/favicons?sz=64&domain=replicate.com",        role: "Product Designer",                              location: "Remote",             area: "AI Infrastructure",   posted: "5d ago",   url: "https://jobs.ashbyhq.com/replicate" },
  { id: 60,  company: "Replicate",        logo: "https://www.google.com/s2/favicons?sz=64&domain=replicate.com",        role: "Design Engineer",                               location: "Remote",             area: "AI Infrastructure",   posted: "57d ago",  url: "https://jobs.ashbyhq.com/replicate" },
  // ── Supabase ──
  { id: 61,  company: "Supabase",         logo: "https://www.google.com/s2/favicons?sz=64&domain=supabase.com",         role: "Product Designer, DevEx",                       location: "Remote",             area: "Developer Tools",     posted: "7d ago",   url: "https://supabase.com/careers#open-roles" },
  { id: 62,  company: "Supabase",         logo: "https://www.google.com/s2/favicons?sz=64&domain=supabase.com",         role: "Design Engineer, Dashboard",                    location: "Remote",             area: "Developer Tools",     posted: "43d ago",  url: "https://supabase.com/careers#open-roles" },
  // ── Arc / The Browser Company (Ashby) ──
  { id: 63,  company: "Arc",              logo: "https://www.google.com/s2/favicons?sz=64&domain=arc.net",              role: "Senior Product Designer, Browser",              location: "New York, NY",       area: "Consumer App",        posted: "3d ago",   url: "https://jobs.ashbyhq.com/thebrowser" },
  { id: 64,  company: "Arc",              logo: "https://www.google.com/s2/favicons?sz=64&domain=arc.net",              role: "UX Researcher",                                 location: "New York, NY",       area: "Consumer App",        posted: "30d ago",  url: "https://jobs.ashbyhq.com/thebrowser" },
  // ── Raycast ──
  { id: 65,  company: "Raycast",          logo: "https://www.google.com/s2/favicons?sz=64&domain=raycast.com",          role: "Product Designer",                              location: "Remote",             area: "Developer Tools",     posted: "8d ago",   url: "https://www.raycast.com/careers" },
  { id: 66,  company: "Raycast",          logo: "https://www.google.com/s2/favicons?sz=64&domain=raycast.com",          role: "Design Engineer",                               location: "Remote",             area: "Developer Tools",     posted: "60d ago",  url: "https://www.raycast.com/careers" },
  // ── Replit (Greenhouse) ──
  { id: 67,  company: "Replit",           logo: "https://www.google.com/s2/favicons?sz=64&domain=replit.com",           role: "Product Designer, AI Coding",                   location: "Remote",             area: "Developer Tools",     posted: "4d ago",   url: "https://boards.greenhouse.io/replit" },
  { id: 68,  company: "Replit",           logo: "https://www.google.com/s2/favicons?sz=64&domain=replit.com",           role: "UX Designer, Mobile",                           location: "Remote",             area: "Developer Tools",     posted: "39d ago",  url: "https://boards.greenhouse.io/replit" },
  // ── Cohere (Lever) ──
  { id: 69,  company: "Cohere",           logo: "https://www.google.com/s2/favicons?sz=64&domain=cohere.com",           role: "Product Designer, Enterprise AI",               location: "Toronto",            area: "AI Research",         posted: "6d ago",   url: "https://jobs.lever.co/cohere" },
  { id: 70,  company: "Cohere",           logo: "https://www.google.com/s2/favicons?sz=64&domain=cohere.com",           role: "Senior UX Designer, Command Platform",          location: "Toronto",            area: "AI Research",         posted: "51d ago",  url: "https://jobs.lever.co/cohere" },
  // ── Scale AI (Greenhouse) ──
  { id: 71,  company: "Scale AI",         logo: "https://www.google.com/s2/favicons?sz=64&domain=scale.com",            role: "Senior UX Designer",                            location: "San Francisco, CA",  area: "AI Infrastructure",   posted: "5d ago",   url: "https://boards.greenhouse.io/scaleai" },
  { id: 72,  company: "Scale AI",         logo: "https://www.google.com/s2/favicons?sz=64&domain=scale.com",            role: "Product Designer, Data Platform",               location: "San Francisco, CA",  area: "AI Infrastructure",   posted: "34d ago",  url: "https://boards.greenhouse.io/scaleai" },
  // ── Loom (Greenhouse) ──
  { id: 73,  company: "Loom",             logo: "https://www.google.com/s2/favicons?sz=64&domain=loom.com",             role: "Senior Product Designer",                       location: "Remote",             area: "Video Comms",         posted: "5d ago",   url: "https://boards.greenhouse.io/loom" },
  { id: 74,  company: "Loom",             logo: "https://www.google.com/s2/favicons?sz=64&domain=loom.com",             role: "UX Researcher, Async Video",                    location: "Remote",             area: "Video Comms",         posted: "45d ago",  url: "https://boards.greenhouse.io/loom" },
  // ── Pitch (Lever) ──
  { id: 75,  company: "Pitch",            logo: "https://www.google.com/s2/favicons?sz=64&domain=pitch.com",            role: "UX Designer, Presentation",                     location: "Berlin",             area: "Productivity",        posted: "10d ago",  url: "https://jobs.lever.co/pitch" },
  { id: 76,  company: "Pitch",            logo: "https://www.google.com/s2/favicons?sz=64&domain=pitch.com",            role: "Product Designer, Collaboration",               location: "Berlin",             area: "Productivity",        posted: "56d ago",  url: "https://jobs.lever.co/pitch" },
  // ── Luma AI (Ashby) ──
  { id: 77,  company: "Luma AI",          logo: "https://www.google.com/s2/favicons?sz=64&domain=lumalabs.ai",          role: "Product Designer, 3D Experiences",              location: "San Francisco, CA",  area: "Generative AI",       posted: "9d ago",   url: "https://jobs.ashbyhq.com/lumaai" },
  { id: 78,  company: "Luma AI",          logo: "https://www.google.com/s2/favicons?sz=64&domain=lumalabs.ai",          role: "UX Designer, Mobile App",                       location: "San Francisco, CA",  area: "Generative AI",       posted: "63d ago",  url: "https://jobs.ashbyhq.com/lumaai" },
  // ── Pika ──
  { id: 79,  company: "Pika",             logo: "https://www.google.com/s2/favicons?sz=64&domain=pika.art",             role: "Product Designer, Video Generation",            location: "Palo Alto, CA",      area: "Generative AI",       posted: "12d ago",  url: "https://pika.art/about#careers" },
  // ── ElevenLabs (Ashby) ──
  { id: 80,  company: "ElevenLabs",       logo: "https://www.google.com/s2/favicons?sz=64&domain=elevenlabs.io",        role: "Product Designer, Voice UX",                    location: "Remote",             area: "Generative AI",       posted: "8d ago",   url: "https://jobs.ashbyhq.com/elevenlabs" },
  { id: 81,  company: "ElevenLabs",       logo: "https://www.google.com/s2/favicons?sz=64&domain=elevenlabs.io",        role: "Senior UX Designer",                            location: "London",             area: "Generative AI",       posted: "37d ago",  url: "https://jobs.ashbyhq.com/elevenlabs" },
  // ── Harvey (Ashby) ──
  { id: 82,  company: "Harvey",           logo: "https://www.google.com/s2/favicons?sz=64&domain=harvey.ai",            role: "Product Designer, Legal AI",                    location: "San Francisco, CA",  area: "Legal AI",            posted: "11d ago",  url: "https://jobs.ashbyhq.com/harvey" },
  { id: 83,  company: "Harvey",           logo: "https://www.google.com/s2/favicons?sz=64&domain=harvey.ai",            role: "Design Lead",                                   location: "San Francisco, CA",  area: "Legal AI",            posted: "59d ago",  url: "https://jobs.ashbyhq.com/harvey" },
  // ── Glean (Ashby) ──
  { id: 84,  company: "Glean",            logo: "https://www.google.com/s2/favicons?sz=64&domain=glean.com",            role: "Senior Product Designer",                       location: "Palo Alto, CA",      area: "Enterprise AI",       posted: "13d ago",  url: "https://jobs.ashbyhq.com/glean" },
  { id: 85,  company: "Glean",            logo: "https://www.google.com/s2/favicons?sz=64&domain=glean.com",            role: "UX Researcher, Enterprise",                     location: "Palo Alto, CA",      area: "Enterprise AI",       posted: "50d ago",  url: "https://jobs.ashbyhq.com/glean" },
  // ── Coda (Greenhouse) ──
  { id: 86,  company: "Coda",             logo: "https://www.google.com/s2/favicons?sz=64&domain=coda.io",              role: "Product Designer, AI Docs",                     location: "San Francisco, CA",  area: "Productivity",        posted: "15d ago",  url: "https://boards.greenhouse.io/coda" },
  { id: 87,  company: "Coda",             logo: "https://www.google.com/s2/favicons?sz=64&domain=coda.io",              role: "Senior UX Researcher",                          location: "Remote",             area: "Productivity",        posted: "62d ago",  url: "https://boards.greenhouse.io/coda" },
  // ── Airtable (Greenhouse) ──
  { id: 88,  company: "Airtable",         logo: "https://www.google.com/s2/favicons?sz=64&domain=airtable.com",         role: "Product Designer, Data Visualization",          location: "San Francisco, CA",  area: "Productivity",        posted: "16d ago",  url: "https://boards.greenhouse.io/airtable" },
  { id: 89,  company: "Airtable",         logo: "https://www.google.com/s2/favicons?sz=64&domain=airtable.com",         role: "Senior Designer, Design Systems",               location: "Remote",             area: "Productivity",        posted: "54d ago",  url: "https://boards.greenhouse.io/airtable" },
  // ── Asana (Greenhouse) ──
  { id: 90,  company: "Asana",            logo: "https://www.google.com/s2/favicons?sz=64&domain=asana.com",            role: "Senior Product Designer, AI",                   location: "San Francisco, CA",  area: "Project Management",  posted: "10d ago",  url: "https://boards.greenhouse.io/asana" },
  { id: 91,  company: "Asana",            logo: "https://www.google.com/s2/favicons?sz=64&domain=asana.com",            role: "UX Researcher, Core Product",                   location: "San Francisco, CA",  area: "Project Management",  posted: "46d ago",  url: "https://boards.greenhouse.io/asana" },
  // ── Monday.com ──
  { id: 92,  company: "Monday.com",       logo: "https://www.google.com/s2/favicons?sz=64&domain=monday.com",           role: "Product Designer, Automations",                 location: "Tel Aviv",           area: "Project Management",  posted: "14d ago",  url: "https://monday.com/careers/openpositions" },
  { id: 93,  company: "Monday.com",       logo: "https://www.google.com/s2/favicons?sz=64&domain=monday.com",           role: "Senior UX Designer, Enterprise",                location: "New York, NY",       area: "Project Management",  posted: "68d ago",  url: "https://monday.com/careers/openpositions" },
  // ── Brex (Greenhouse) ──
  { id: 94,  company: "Brex",             logo: "https://www.google.com/s2/favicons?sz=64&domain=brex.com",             role: "Product Designer, Spend Management",            location: "Remote",             area: "Fintech",             posted: "11d ago",  url: "https://boards.greenhouse.io/brex" },
  { id: 95,  company: "Brex",             logo: "https://www.google.com/s2/favicons?sz=64&domain=brex.com",             role: "Design Systems Designer",                       location: "Remote",             area: "Fintech",             posted: "44d ago",  url: "https://boards.greenhouse.io/brex" },
  // ── Robinhood (Greenhouse) ──
  { id: 96,  company: "Robinhood",        logo: "https://www.google.com/s2/favicons?sz=64&domain=robinhood.com",        role: "Senior Product Designer, Investing",            location: "Menlo Park, CA",     area: "Fintech",             posted: "19d ago",  url: "https://boards.greenhouse.io/robinhood" },
  { id: 97,  company: "Robinhood",        logo: "https://www.google.com/s2/favicons?sz=64&domain=robinhood.com",        role: "UX Researcher, Crypto",                         location: "Remote",             area: "Fintech",             posted: "55d ago",  url: "https://boards.greenhouse.io/robinhood" },
  // ── Plaid (Greenhouse) ──
  { id: 98,  company: "Plaid",            logo: "https://www.google.com/s2/favicons?sz=64&domain=plaid.com",            role: "Product Designer, Developer Experience",        location: "San Francisco, CA",  area: "Fintech",             posted: "23d ago",  url: "https://boards.greenhouse.io/plaid" },
  // ── Intercom (Greenhouse) ──
  { id: 99,  company: "Intercom",         logo: "https://www.google.com/s2/favicons?sz=64&domain=intercom.com",         role: "Product Designer, AI Support",                  location: "Dublin",             area: "Enterprise AI",       posted: "9d ago",   url: "https://boards.greenhouse.io/intercom" },
  { id: 100, company: "Intercom",         logo: "https://www.google.com/s2/favicons?sz=64&domain=intercom.com",         role: "Senior UX Designer, Messenger",                 location: "San Francisco, CA",  area: "Enterprise AI",       posted: "38d ago",  url: "https://boards.greenhouse.io/intercom" },
  // ── Salesforce ──
  { id: 101, company: "Salesforce",       logo: "https://www.google.com/s2/favicons?sz=64&domain=salesforce.com",       role: "Senior Product Designer, Einstein AI",          location: "San Francisco, CA",  area: "Enterprise AI",       posted: "12d ago",  url: "https://careers.salesforce.com/jobs#q=designer&t=1" },
  { id: 102, company: "Salesforce",       logo: "https://www.google.com/s2/favicons?sz=64&domain=salesforce.com",       role: "UX Researcher, CRM",                            location: "Indianapolis, IN",   area: "Enterprise AI",       posted: "64d ago",  url: "https://careers.salesforce.com/jobs#q=UX+researcher&t=1" },
  // ── HubSpot (Greenhouse) ──
  { id: 103, company: "HubSpot",          logo: "https://www.google.com/s2/favicons?sz=64&domain=hubspot.com",          role: "Product Designer, AI Tools",                    location: "Cambridge, MA",      area: "Enterprise AI",       posted: "18d ago",  url: "https://boards.greenhouse.io/hubspot" },
  { id: 104, company: "HubSpot",          logo: "https://www.google.com/s2/favicons?sz=64&domain=hubspot.com",          role: "Design Systems Designer",                       location: "Remote",             area: "Enterprise AI",       posted: "70d ago",  url: "https://boards.greenhouse.io/hubspot" },
  // ── Canva ──
  { id: 105, company: "Canva",            logo: "https://www.google.com/s2/favicons?sz=64&domain=canva.com",            role: "Product Designer, AI Create",                   location: "Sydney",             area: "Design Tools",        posted: "5d ago",   url: "https://www.canva.com/careers/jobs/" },
  { id: 106, company: "Canva",            logo: "https://www.google.com/s2/favicons?sz=64&domain=canva.com",            role: "Senior UX Designer, Mobile",                    location: "Sydney",             area: "Design Tools",        posted: "26d ago",  url: "https://www.canva.com/careers/jobs/" },
  { id: 107, company: "Canva",            logo: "https://www.google.com/s2/favicons?sz=64&domain=canva.com",            role: "UX Researcher, Growth",                         location: "Remote",             area: "Design Tools",        posted: "69d ago",  url: "https://www.canva.com/careers/jobs/" },
  // ── Shopify ──
  { id: 108, company: "Shopify",          logo: "https://www.google.com/s2/favicons?sz=64&domain=shopify.com",          role: "Senior Product Designer, Checkout",             location: "Remote",             area: "E-commerce",          posted: "7d ago",   url: "https://www.shopify.com/careers/search?specialties[]=ux-design" },
  { id: 109, company: "Shopify",          logo: "https://www.google.com/s2/favicons?sz=64&domain=shopify.com",          role: "Design Systems Designer",                       location: "Remote",             area: "E-commerce",          posted: "32d ago",  url: "https://www.shopify.com/careers/search?specialties[]=ux-design" },
  { id: 110, company: "Shopify",          logo: "https://www.google.com/s2/favicons?sz=64&domain=shopify.com",          role: "UX Researcher, Merchant Experience",            location: "Toronto",            area: "E-commerce",          posted: "71d ago",  url: "https://www.shopify.com/careers/search?specialties[]=ux-design" },
  // ── Duolingo (Greenhouse) ──
  { id: 111, company: "Duolingo",         logo: "https://www.google.com/s2/favicons?sz=64&domain=duolingo.com",         role: "Senior Product Designer, AI Learning",          location: "Pittsburgh, PA",     area: "Consumer App",        posted: "15d ago",  url: "https://boards.greenhouse.io/duolingo" },
  { id: 112, company: "Duolingo",         logo: "https://www.google.com/s2/favicons?sz=64&domain=duolingo.com",         role: "Motion Designer",                               location: "Pittsburgh, PA",     area: "Consumer App",        posted: "72d ago",  url: "https://boards.greenhouse.io/duolingo" },
  // ── Spotify ──
  { id: 113, company: "Spotify",          logo: "https://www.google.com/s2/favicons?sz=64&domain=spotify.com",          role: "Senior Product Designer, Discovery",            location: "New York, NY",       area: "Consumer App",        posted: "10d ago",  url: "https://www.lifeatspotify.com/jobs?l=&d=design" },
  { id: 114, company: "Spotify",          logo: "https://www.google.com/s2/favicons?sz=64&domain=spotify.com",          role: "UX Researcher, Podcasts",                       location: "Stockholm",          area: "Consumer App",        posted: "47d ago",  url: "https://www.lifeatspotify.com/jobs?l=&d=design" },
  // ── Netflix ──
  { id: 115, company: "Netflix",          logo: "https://www.google.com/s2/favicons?sz=64&domain=netflix.com",          role: "Product Designer, Content Discovery",           location: "Los Gatos, CA",      area: "Consumer App",        posted: "20d ago",  url: "https://jobs.netflix.com/search?q=designer" },
  { id: 116, company: "Netflix",          logo: "https://www.google.com/s2/favicons?sz=64&domain=netflix.com",          role: "Senior UX Designer, Games",                     location: "Remote",             area: "Consumer App",        posted: "65d ago",  url: "https://jobs.netflix.com/search?q=UX+designer" },
  // ── Airbnb ──
  { id: 117, company: "Airbnb",           logo: "https://www.google.com/s2/favicons?sz=64&domain=airbnb.com",           role: "Staff Product Designer, Search",                location: "San Francisco, CA",  area: "Consumer App",        posted: "22d ago",  url: "https://careers.airbnb.com/positions/?department=Design" },
  { id: 118, company: "Airbnb",           logo: "https://www.google.com/s2/favicons?sz=64&domain=airbnb.com",           role: "UX Researcher, Host Experience",                location: "San Francisco, CA",  area: "Consumer App",        posted: "73d ago",  url: "https://careers.airbnb.com/positions/?department=UX+Research" },
  // ── Uber ──
  { id: 119, company: "Uber",             logo: "https://www.google.com/s2/favicons?sz=64&domain=uber.com",             role: "Senior Product Designer, Earner",               location: "San Francisco, CA",  area: "Consumer App",        posted: "25d ago",  url: "https://www.uber.com/global/en/careers/list/?query=designer" },
  { id: 120, company: "Uber",             logo: "https://www.google.com/s2/favicons?sz=64&domain=uber.com",             role: "Design Systems Engineer",                       location: "San Francisco, CA",  area: "Consumer App",        posted: "74d ago",  url: "https://www.uber.com/global/en/careers/list/?query=design+engineer" },
  // ── Writer (Greenhouse) ──
  { id: 122, company: "Writer",           logo: "https://www.google.com/s2/favicons?sz=64&domain=writer.com",           role: "Product Designer, Enterprise AI Writing",       location: "San Francisco, CA",  area: "Enterprise AI",       posted: "26d ago",  url: "https://boards.greenhouse.io/writer" },
  // ── Jasper (Greenhouse) ──
  { id: 123, company: "Jasper",           logo: "https://www.google.com/s2/favicons?sz=64&domain=jasper.ai",            role: "Senior UX Designer",                            location: "Austin, TX",         area: "Enterprise AI",       posted: "43d ago",  url: "https://boards.greenhouse.io/jasper" },
  // ── Character AI (Ashby) ──
  { id: 124, company: "Character AI",     logo: "https://www.google.com/s2/favicons?sz=64&domain=character.ai",         role: "Product Designer, Conversation UX",             location: "Menlo Park, CA",     area: "AI Research",         posted: "17d ago",  url: "https://jobs.ashbyhq.com/character" },
  { id: 125, company: "Character AI",     logo: "https://www.google.com/s2/favicons?sz=64&domain=character.ai",         role: "Senior UX Researcher",                          location: "Menlo Park, CA",     area: "AI Research",         posted: "76d ago",  url: "https://jobs.ashbyhq.com/character" },
  // ── Weights & Biases (Greenhouse) ──
  { id: 126, company: "Weights & Biases", logo: "https://www.google.com/s2/favicons?sz=64&domain=wandb.ai",             role: "Product Designer, ML Tooling",                  location: "Remote",             area: "AI Infrastructure",   posted: "28d ago",  url: "https://boards.greenhouse.io/wandb" },
  // ── Hugging Face (Workable) ──
  { id: 127, company: "Hugging Face",     logo: "https://www.google.com/s2/favicons?sz=64&domain=huggingface.co",       role: "Product Designer, Model Hub",                   location: "Remote",             area: "AI Infrastructure",   posted: "35d ago",  url: "https://apply.workable.com/huggingface/" },
  { id: 128, company: "Hugging Face",     logo: "https://www.google.com/s2/favicons?sz=64&domain=huggingface.co",       role: "UX Designer, Spaces",                           location: "Paris",              area: "AI Infrastructure",   posted: "77d ago",  url: "https://apply.workable.com/huggingface/" },
  // ── Together AI (Ashby) ──
  { id: 129, company: "Together AI",      logo: "https://www.google.com/s2/favicons?sz=64&domain=together.ai",          role: "Product Designer, Developer Platform",          location: "San Francisco, CA",  area: "AI Infrastructure",   posted: "31d ago",  url: "https://jobs.ashbyhq.com/together" },
  // ── Figma extra ──
  { id: 121, company: "Figma",            logo: "https://www.google.com/s2/favicons?sz=64&domain=figma.com",            role: "Product Designer, Community",                   location: "San Francisco, CA",  area: "Design Tools",        posted: "75d ago",  url: "https://boards.greenhouse.io/figma" },
  // ── Solara Talent — verified live roles ──
  { id: 132, company: "BetterSleep",      logo: "https://www.google.com/s2/favicons?sz=64&domain=bettersleep.com",      role: "Senior Designer, Core Experience",              location: "Remote (US/Canada)", area: "Health & Wellness",   posted: "3d ago",   url: "https://jobs.solaratalent.com/roles" },
  { id: 133, company: "Gumloop",          logo: "https://www.google.com/s2/favicons?sz=64&domain=gumloop.com",          role: "Product Designer",                              location: "San Francisco, CA",  area: "AI Automation",       posted: "3d ago",   url: "https://jobs.solaratalent.com/roles" },
  { id: 134, company: "SOMETHINGS",       logo: "https://www.google.com/s2/favicons?sz=64&domain=somethings.com",       role: "Head of Design",                                location: "New York, NY",       area: "Health Tech",         posted: "3d ago",   url: "https://jobs.solaratalent.com/roles" },
];

// Each job stores days as a number for sorting + display
// On each daily refresh we bump all posted values by 1
const REFRESH_KEY = "jobs_refresh_date";
const OFFSET_KEY  = "jobs_day_offset";

function getDayOffset() {
  const today = new Date().toDateString();
  const stored = localStorage.getItem(REFRESH_KEY);
  if (stored !== today) {
    const prev = parseInt(localStorage.getItem(OFFSET_KEY) || "0");
    localStorage.setItem(OFFSET_KEY, prev + 1);
    localStorage.setItem(REFRESH_KEY, today);
  }
  return parseInt(localStorage.getItem(OFFSET_KEY) || "0");
}

const DAY_OFFSET = getDayOffset();

function formatPosted(rawDays) {
  const d = rawDays + DAY_OFFSET;
  if (d < 7)  return d === 0 ? "Today" : `${d}d ago`;
  if (d < 28) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 28)}mo ago`;
}

// Pull the numeric days from the "Xd ago" seed string
const parseDays = (s) => parseInt(s) || 0;
const JOBS_SORTED = [...JOBS]
  .sort((a, b) => parseDays(a.posted) - parseDays(b.posted))
  .map(j => ({ ...j, postedDays: parseDays(j.posted) }));

const AREAS = [...new Set(JOBS.map(j => j.area))].sort();
const COMPANIES = [...new Set(JOBS.map(j => j.company))].sort();

// ─── SHARED STYLES ───────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; text-align: left; }
  #root { text-align: left; }

  .sticky-header {
    position: sticky; top: 0; z-index: 300; background: #fff;
    transition: box-shadow 0.2s ease;
  }
  .sticky-header.scrolled { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

  .ascii-hero {
    overflow: hidden; background: #fff;
    padding: 44px 48px 40px; border-bottom: 1px solid #e8e8e8; text-align: left; width: 100%;
    transition: padding 0.25s ease;
  }
  .ascii-hero.compact {
    padding: 14px 48px 12px;
    background: #fff;
  }
  .ascii-hero.compact .hero-title { font-size: 18px; font-weight: 500; margin-bottom: 0; letter-spacing: -0.2px; transition: font-size 0.25s ease; }
  .ascii-hero.compact .hero-subtitle { display: none; }
  .ascii-hero.compact .hero-label { display: none; }
  .ascii-bg {
    position: absolute; inset: 0;
    font-family: 'Courier New', monospace; font-size: 11px;
    line-height: 1.55; letter-spacing: 1px;
    color: rgba(0,0,0,0.07); white-space: pre;
    padding: 12px 16px; pointer-events: none; overflow: hidden; user-select: none;
  }
  .hero-content { position: relative; z-index: 1; }
  .hero-label {
    font-family: 'Courier New', monospace; font-size: 11px;
    letter-spacing: 3px; text-transform: uppercase; color: #888; margin-bottom: 14px;
  }
  .hero-title {
    font-size: clamp(28px, 4vw, 46px); font-weight: 400; line-height: 1.15;
    letter-spacing: -0.5px; color: #111; margin: 0 0 14px;
  }
  .hero-subtitle {
    font-size: 15px; color: #666; line-height: 1.6; margin: 0; max-width: 460px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  /* Tabs */
  .tab-bar {
    display: flex; border-bottom: 1px solid #e8e8e8;
    background: #fff; padding: 0 48px; gap: 0;
  }
  .tab-btn {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 2px;
    text-transform: uppercase; color: #999; background: none; border: none;
    padding: 14px 0; margin-right: 32px; cursor: pointer;
    border-bottom: 2px solid transparent; transition: all 0.15s;
  }
  .tab-btn:hover { color: #333; }
  .tab-btn.active { color: #111; border-bottom-color: #111; }

  /* Main content */
  .main-content { padding: 0 48px 80px; text-align: left; width: 100%; }

  /* Interview */
  .tips-row { display: flex; gap: 8px; flex-wrap: wrap; margin: 40px 0 36px; }
  .tip-chip {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.5px;
    color: #888; background: #fff; border: 1px solid #ddd; border-radius: 20px; padding: 6px 14px;
  }
  .start-btn {
    display: inline-block; background: #111; color: #fff; border: none;
    padding: 13px 32px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 2px; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: background 0.2s;
  }
  .start-btn:hover { background: #333; }

  .chat-area { padding-top: 36px; display: flex; flex-direction: column; }
  .message-row { display: flex; flex-direction: column; padding: 22px 0; border-bottom: 1px solid #eee; }
  .message-row:first-child { border-top: 1px solid #eee; }
  .msg-label {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; margin-bottom: 10px;
  }
  .msg-label.interviewer { color: #111; }
  .msg-label.you { color: #999; }
  .msg-body {
    font-size: 15px; line-height: 1.8; color: #222; white-space: pre-wrap;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; width: 100%;
  }
  .msg-body.you { color: #555; }

  .typing-row { display: flex; flex-direction: column; padding: 22px 0; border-bottom: 1px solid #eee; }
  .typing-dots { display: flex; gap: 5px; align-items: center; margin-top: 4px; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: #bbb; animation: blink 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  .input-wrap {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: #fff; border-top: 1px solid #eee;
    padding: 18px 48px 22px;
  }
  /* Space so last message isn't hidden behind fixed input */
  .chat-area { padding-bottom: 120px; }
  .input-inner { display: flex; gap: 12px; align-items: flex-end; }
  textarea.chat-input {
    flex: 1; border: 1px solid #ddd; border-radius: 8px;
    padding: 12px 16px; font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6; background: #fff; color: #222; resize: none; outline: none;
    overflow-y: auto; transition: border-color 0.15s; min-height: 46px; max-height: 800px;
  }
  textarea.chat-input:focus { border-color: #111; }
  textarea.chat-input::placeholder { color: #bbb; }
  .send-btn {
    background: #111; color: #fff; border: none; border-radius: 8px;
    padding: 10px 20px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 1px; cursor: pointer; white-space: nowrap; transition: background 0.15s;
  }
  .send-btn:hover:not(:disabled) { background: #333; }
  .send-btn:disabled { background: #eee; color: #bbb; cursor: default; }
  .input-hint { font-family: 'Courier New', monospace; font-size: 10px; color: #ccc; margin-top: 8px; }

  .done-section { padding: 48px 0 32px; }
  .done-label { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #999; margin-bottom: 24px; }
  .restart-btn {
    background: transparent; color: #111; border: 1px solid #111;
    padding: 11px 28px; font-size: 12px; font-family: 'Courier New', monospace;
    letter-spacing: 2px; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: all 0.15s;
  }
  .restart-btn:hover { background: #111; color: #fff; }

  /* ── Jobs Tab ── */
  .jobs-controls {
    display: flex; gap: 12px; align-items: center;
    flex-wrap: wrap;
    background: #fff; border-bottom: 1px solid #eee;
    margin: 0; padding: 14px 48px;
  }
  .search-box {
    border: 1px solid #ddd; border-radius: 8px; padding: 9px 14px;
    font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #222; background: #fff; outline: none; width: 240px; transition: border-color 0.15s;
  }
  .search-box:focus { border-color: #111; }
  .search-box::placeholder { color: #bbb; }
  .filter-select {
    border: 1px solid #ddd; border-radius: 8px; padding: 9px 30px 9px 12px;
    font-size: 12px; font-family: 'Courier New', monospace; letter-spacing: 0.5px;
    color: #555; background: #fff; outline: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    cursor: pointer; transition: border-color 0.15s;
  }
  .filter-select:focus { border-color: #111; }
  .clear-btn {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 1px;
    text-transform: uppercase; color: #999; background: none; border: none;
    cursor: pointer; padding: 0; transition: color 0.15s;
  }
  .clear-btn:hover { color: #111; }
  .jobs-count {
    margin-left: auto; font-family: 'Courier New', monospace;
    font-size: 10px; letter-spacing: 1px; color: #bbb; text-transform: uppercase;
  }

  .jobs-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .jobs-table th {
    font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 2px;
    text-transform: uppercase; color: #999; font-weight: 400;
    padding: 12px 16px 12px 0; border-bottom: 1px solid #111; text-align: left;
    position: sticky; top: var(--sticky-h, 0px); background: #fff; z-index: 50;
  }
  .jobs-table th:last-child { text-align: right; padding-right: 0; }
  .jobs-table td {
    padding: 14px 16px 14px 0; border-bottom: 1px solid #eee;
    font-size: 13px; vertical-align: middle;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #222;
  }
  .jobs-table td:last-child { text-align: right; padding-right: 0; }
  .jobs-table tr:hover td { background: #fafafa; }

  .company-cell { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
  .company-logo { width: 20px; height: 20px; border-radius: 4px; object-fit: contain; border: 1px solid #eee; flex-shrink: 0; }
  .company-name {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px;
    color: #222; cursor: pointer; border-bottom: 1px solid transparent; transition: border-color 0.15s;
  }
  .company-name:hover { border-bottom-color: #111; }
  .company-name.filtered { border-bottom-color: #111; font-weight: bold; }

  .area-badge {
    display: inline-block; font-family: 'Courier New', monospace; font-size: 10px;
    letter-spacing: 0.5px; color: #777; background: #f4f4f4;
    border-radius: 20px; padding: 3px 10px; white-space: nowrap;
  }
  .posted-text { font-size: 12px; color: #aaa; white-space: nowrap; }
  .apply-link {
    font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 1px;
    color: #111; text-decoration: none; border-bottom: 1px solid #ddd; transition: border-color 0.15s;
  }
  .apply-link:hover { border-bottom-color: #111; }

  .no-results {
    padding: 56px 0; font-family: 'Courier New', monospace;
    font-size: 12px; letter-spacing: 1px; color: #bbb; text-transform: uppercase;
  }
`;

// ─── JOBS CONTROLS ───────────────────────────────────────────────────────────

const LAST_REFRESHED = (() => {
  const now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
})();

function JobsControls({ search, setSearch, areaFilter, setAreaFilter, companyFilter, setCompanyFilter, count }) {
  const hasFilters = search || areaFilter || companyFilter;
  return (
    <div className="jobs-controls">
      <input
        className="search-box"
        placeholder="Search role, company, location…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select className="filter-select" value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
        <option value="">All areas</option>
        {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
      </select>
      <select className="filter-select" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}>
        <option value="">All companies</option>
        {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {hasFilters && (
        <button className="clear-btn" onClick={() => { setSearch(""); setAreaFilter(""); setCompanyFilter(""); }}>
          Clear ×
        </button>
      )}
      <span className="jobs-count">{count} role{count !== 1 ? "s" : ""}</span>
      <span style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: "#ccc", letterSpacing: "0.5px" }}>
        Refreshed {LAST_REFRESHED}
      </span>
    </div>
  );
}

// ─── JOBS TAB ────────────────────────────────────────────────────────────────

function JobsTab({ search, areaFilter, companyFilter, setCompanyFilter }) {
  const filtered = JOBS_SORTED.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.role.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.area.toLowerCase().includes(q) || j.location.toLowerCase().includes(q);
    const matchArea = !areaFilter || j.area === areaFilter;
    const matchCompany = !companyFilter || j.company === companyFilter;
    return matchSearch && matchArea && matchCompany;
  });

  const handleCompanyClick = (company) => {
    setCompanyFilter(prev => prev === company ? "" : company);
  };

  return (
    <div className="main-content">
      {filtered.length === 0 ? (
        <div className="no-results">No roles found</div>
      ) : (
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Role</th>
              <th>Area</th>
              <th>Location</th>
              <th>Posted</th>
              <th>Apply</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(job => (
              <tr key={job.id}>
                <td>
                  <div className="company-cell">
                    <img className="company-logo" src={job.logo} alt={job.company} onError={e => { e.target.style.display = "none"; }} />
                    <span
                      className={`company-name ${companyFilter === job.company ? "filtered" : ""}`}
                      onClick={() => handleCompanyClick(job.company)}
                      title={companyFilter === job.company ? "Click to clear filter" : `Filter by ${job.company}`}
                    >
                      {job.company}
                    </span>
                  </div>
                </td>
                <td>{job.role}</td>
                <td><span className="area-badge">{job.area}</span></td>
                <td style={{ color: "#666" }}>{job.location}</td>
                <td><span className="posted-text">{formatPosted(job.postedDays)}</span></td>
                <td>
                  <a className="apply-link" href={job.url} target="_blank" rel="noopener noreferrer">Apply ↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── LOCAL INTERVIEW ENGINE ───────────────────────────────────────────────────

const CHALLENGES = [
  {
    prompt: "Redesign the onboarding flow for a B2B accounting tool — users are dropping off before completing setup.",
    context: { company: "a B2B accounting SaaS", users: "small business owners and accountants", goal: "reduce onboarding drop-off, which currently sits at 62% before step 3" },
    clarifyAnswers: {
      default: "Good question. The current flow has 6 steps: account creation, company details, connecting a bank account, inviting team members, setting up a chart of accounts, and a tutorial. Most users drop off at bank connection.",
      where: "Most users drop off at step 3 — connecting a bank account. It requires OAuth authentication and users seem to hesitate or not have credentials ready.",
      who: "Primary users are small business owners (non-technical) and their accountants. They're often setting this up together remotely.",
      why: "We think it's a combination of trust issues (sharing bank credentials feels scary) and timing — they're not ready to do it during initial signup.",
      how: "We currently have a linear, mandatory flow. There's no way to skip or come back to steps later.",
      metric: "Our goal is to get 80% of users to complete setup within 7 days of signup.",
    },
    probes: [
      "Interesting — why did you choose to make bank connection optional rather than just simplify it?",
      "What would a 55-year-old accountant who's not very tech-savvy think of that flow?",
      "How does skipping steps connect to the business goal of getting users fully set up?",
      "If you could only fix one thing in that flow, what would it be and why?",
      "Walk me through what the empty state looks like after a user skips bank connection — what do they see?",
    ],
    pushback: "I hear you on making the bank connection optional — but our data shows users who skip it have a 3x lower retention rate at 30 days. Doesn't that undermine the whole point of onboarding?",
    pushbackFollowup: "That's a fair response. How would you measure success for your redesign — what's the metric you'd watch first?",
    feedback: `Here's my honest feedback on this session:

**Process** — You asked clarifying questions before jumping in, which is exactly right. You understood the drop-off point and the user context before proposing solutions.

**Communication** — You narrated your thinking clearly. I could follow your reasoning even when I pushed back.

**Design rationale** — Your decisions connected to real user behavior (the bank connection hesitation). You grounded your ideas in the context I gave you.

**Handling pushback** — You held your ground with data reasoning rather than folding immediately. That's a good instinct — just make sure you're also genuinely listening and updating your view when the pushback reveals something you missed.

**One key thing to improve** — Go deeper on edge cases during the session. What happens to a user who skips every optional step? What does their account look like on day 2? Interviewers look for that kind of forward-thinking.`,
  },
  {
    prompt: "Design a feature that helps users of a budgeting app understand why they went over budget last month.",
    context: { company: "a consumer budgeting app (think Mint or YNAB)", users: "millennials tracking personal spending", goal: "increase monthly active users and improve financial literacy scores" },
    clarifyAnswers: {
      default: "Sure. We have about 2M MAU. Users connect bank accounts and set monthly budgets per category — groceries, dining, transport, etc. The average user has 8 categories. We already show them bar charts of spend vs. budget.",
      who: "Mostly 25–38 year olds. Mix of people who are very intentional about budgeting and people who downloaded the app after a stressful month and haven't fully engaged.",
      data: "We have full transaction history, merchant data, category tags, and historical averages. We can see trends month-over-month.",
      where: "This would live in the monthly summary view, which users see when they open the app at the start of a new month.",
      why: "Right now we just show them they overspent. We don't explain why — was it one big purchase? A pattern of small ones? Seasonal? Users feel bad but don't know how to change.",
    },
    probes: [
      "Why did you lead with the biggest single transaction rather than the category trend?",
      "What does someone who's already stressed about money feel when they open this screen?",
      "How does showing 'why' translate into behavior change — what's the mechanism?",
      "What would you cut if you had half the dev time you assumed?",
      "How is this different from just showing a better bar chart?",
    ],
    pushback: "Your 'insight card' idea is interesting — but we've tried surfacing spend insights before and users ignored them. They scroll past anything that looks like a notification. Why would this be different?",
    pushbackFollowup: "Good — so placement and timing are your bet. How would you validate that hypothesis quickly before we invest in building it?",
    feedback: `Here's my feedback on this session:

**Process** — Strong start. You asked about the data we have available before designing, which is smart — the solution only works if the data supports it.

**Communication** — You explained your reasoning well. When I pushed back you didn't just restate your idea — you identified the specific variable (placement vs. content) that you were betting on.

**Design rationale** — Your decisions connected to the emotional state of the user (stressed, looking backward). That's good empathy work.

**Handling pushback** — You took the pushback seriously and turned it into a testable hypothesis. That's exactly the right move.

**One key thing to improve** — Push yourself to be more specific about the visual. "An insight card" is a concept, not a design. What does it look like? What's the copy? How many words? Sketching even verbally ("imagine a white card with the merchant logo, one bold number, and two lines of explanation") would make your ideas much more concrete and memorable to an interviewer.`,
  },
  {
    prompt: "A SaaS project management tool wants to add an AI assistant. Design how it surfaces suggestions without disrupting the user's workflow.",
    context: { company: "a project management tool used by engineering teams (think Linear or Jira)", users: "engineers and engineering managers", goal: "increase task completion rate and reduce time-to-assign on new issues" },
    clarifyAnswers: {
      default: "Good questions. The tool has tasks, projects, sprints, and a timeline view. Engineers use it all day — they're heads-down, context-switching is painful for them. The AI would have access to task history, team velocity, and GitHub activity.",
      who: "Primarily software engineers (IC) and their managers. Very keyboard-driven users who hate interruptions.",
      what: "The AI suggestions we want to surface: auto-assigning tasks based on workload, flagging blocked tasks, suggesting due dates based on velocity, and summarizing long comment threads.",
      when: "We're not sure yet — that's partly what we want you to figure out. Should it be proactive or on-demand?",
      how: "We have a sidebar, an inline comment area, a command palette, and a notification tray. All are potential surfaces.",
    },
    probes: [
      "Why did you choose the command palette over a persistent sidebar for AI suggestions?",
      "How would a senior engineer who hates AI features react to seeing this?",
      "You mentioned 'non-intrusive' — how do you define that? When does helpful become annoying?",
      "What's the worst-case scenario if the AI suggestion is wrong?",
      "How does your solution connect to the goal of reducing time-to-assign?",
    ],
    pushback: "The command palette is keyboard-accessible and clean — I like it. But our data shows only 20% of users use the command palette at all. You're designing for power users. What about the other 80%?",
    pushbackFollowup: "So you're proposing a two-tier approach. How do you prevent the passive suggestion from feeling like a notification that gets ignored — or worse, creates anxiety?",
    feedback: `Here's my feedback on this session:

**Process** — Excellent. You immediately identified the core tension (AI helpfulness vs. workflow disruption) and asked who the user is before proposing surfaces. That's senior-level thinking.

**Communication** — Very clear. You used concrete examples (command palette, sidebar) and defined your terms ("non-intrusive" is vague without a definition — you handled the follow-up well).

**Design rationale** — Connecting your surface choice to user behavior (keyboard-driven, interruption-averse) was strong. You designed for the actual person, not the average person.

**Handling pushback** — When I pointed out the 20% command palette usage, you adapted quickly. You didn't abandon your idea — you extended it. That's good judgment.

**One key thing to improve** — Think about the AI being wrong. You touched on it briefly but the failure state is just as important as the success state. What happens when the AI assigns the wrong person? How does the user correct it without friction? Interviewers at AI-first companies will always probe this.`,
  },
  {
    prompt: "Redesign the notification settings for a mobile banking app — users report feeling overwhelmed by alerts.",
    context: { company: "a major retail bank's mobile app", users: "a broad demographic — 18 to 70+, all income levels", goal: "reduce notification opt-out rate (currently 34%) without reducing engagement" },
    clarifyAnswers: {
      default: "Currently we send up to 12 types of notifications: transaction alerts, low balance warnings, payment reminders, fraud alerts, promotional offers, rate change updates, statement ready, large purchase alerts, direct deposit confirmations, spending insights, weekly summaries, and in-app messages.",
      who: "Very broad. Our power users want every transaction alert. Our casual users (majority) open the app maybe 3x a month and find all notifications intrusive.",
      why: "Exit surveys show users say they turn off notifications because they 'get too many.' But when they turn them all off, they miss fraud alerts — which is dangerous for them and costly for us.",
      current: "Right now it's a single toggle: all on or all off, then a list of 12 individual toggles. Most users just hit 'all off.'",
      metric: "Success is: opt-out rate drops below 20%, and fraud alert open-rate stays above 90%.",
    },
    probes: [
      "Why did you group notifications into tiers rather than letting users fully customize?",
      "How does a 68-year-old who's not tech-savvy navigate your settings screen?",
      "What's the risk of your 'smart defaults' approach if the bank gets the defaults wrong?",
      "How does this connect to the goal — what specifically drives the opt-out rate down?",
      "What's the first thing you'd build if you could only ship one part of this?",
    ],
    pushback: "I like the tiered approach — but grouping notifications means users can't turn off just promotional offers while keeping spending insights. You're taking control away from them. Isn't that paternalistic?",
    pushbackFollowup: "So tiers as defaults, with granular control underneath. That's a reasonable compromise. How do you surface that granular layer without making it feel like a dark pattern — like we're hiding it?",
    feedback: `Here's my feedback on this session:

**Process** — You asked the right questions: who the users are, why they're opting out, what 'success' means. You didn't assume the solution before understanding the problem.

**Communication** — Clear and structured. You explained the trade-offs in your tiered approach honestly, which is exactly what a real interviewer wants to see.

**Design rationale** — Your insight that 'all or nothing' is the root problem — not the quantity of notifications — was sharp. You reframed the problem well.

**Handling pushback** — You engaged with the paternalism concern seriously rather than dismissing it. You found a middle path (tiers as defaults + granular escape hatch) without abandoning the core idea.

**One key thing to improve** — Spend more time on the onboarding moment. When does a user first set these preferences? At signup? First notification? A prompt after their third week? The timing of consent and defaults matters enormously for a feature like this, and it's often what distinguishes a thoughtful designer from one who just solved the surface problem.`,
  },
  {
    prompt: "Design an empty state for a new user's dashboard on a financial analytics platform.",
    context: { company: "a B2B financial analytics platform (think Tableau for finance teams)", users: "CFOs, financial analysts, and their teams at mid-size companies", goal: "reduce time-to-first-value — get users to see meaningful data within their first session" },
    clarifyAnswers: {
      default: "The dashboard shows KPIs, charts, and reports pulled from connected data sources — accounting software, ERPs, spreadsheets. A new user sees a completely blank dashboard until they connect a data source and configure at least one report.",
      who: "Financial analysts are the primary builders. CFOs are consumers who look at dashboards but rarely build them. Both need to feel confident immediately.",
      why: "Currently, 40% of new users who reach the dashboard during onboarding leave without connecting a data source. They say the blank state feels 'intimidating' and they 'don't know where to start.'",
      what: "We have sample data available — anonymized financials that look real. We also have templates for common report types (P&L, cash flow, budget vs. actuals).",
      when: "This is the first thing a user sees after completing account setup. They haven't connected any data yet.",
    },
    probes: [
      "Why did you choose to show sample data rather than a guided empty state with prompts?",
      "How does a CFO who's evaluating this tool for their team react to seeing fake data?",
      "What's the risk that sample data creates false expectations about what the tool can do?",
      "How does this connect to the goal — what's the specific mechanism that reduces time-to-first-value?",
      "What's the single most important action you want a user to take from this empty state?",
    ],
    pushback: "Showing sample data is smart for getting people unstuck. But if they spend 20 minutes exploring sample data and then realize none of it is theirs — won't they feel misled? Like it was a demo, not a real product?",
    pushbackFollowup: "So persistent labeling and a clear 'connect your data' CTA are your guardrails. How prominent does that CTA need to be — and does it compete with the sample data experience?",
    feedback: `Here's my feedback on this session:

**Process** — You asked about available assets (sample data, templates) before designing, which is practically-minded and shows maturity. You also correctly identified the emotional problem — intimidation — not just the functional one.

**Communication** — Good. You articulated the sample data rationale clearly, and when I pushed back on the deception risk, you had a specific answer ready (persistent labeling).

**Design rationale** — Connecting sample data to 'time-to-first-value' was well-reasoned. You understood that the goal is engagement, not just aesthetics.

**Handling pushback** — You took the concern seriously without abandoning your approach. You identified the specific design decision (CTA prominence) that would determine whether your solution works.

**One key thing to improve** — Think about the transition moment more carefully. The most critical UX in your design isn't the empty state — it's the moment a user switches from sample data to their own data. What does that handoff look like? Is it one click? Does their first real dashboard look as good as the sample? That transition is where the design either delivers on its promise or breaks trust.`,
  },
];

// Simple stage-based response engine
const STAGES = ["intro", "clarify", "design", "probe1", "probe2", "pushback", "wrapup", "done"];

function getInterviewerReply(challenge, stage, userMsg) {
  const msg = userMsg.toLowerCase();

  if (stage === "intro") {
    return { text: `Hi — I'm Sarah, a senior design lead here. Thanks for coming in today.\n\nWe're going to do a 30-minute design challenge. I'll give you a prompt, and I want to see how you think through it — clarifying questions, your reasoning, trade-offs. There's no perfect answer.\n\nHere's your challenge:\n\n"${challenge.prompt}"\n\nTake a moment, then feel free to ask me anything before you start.`, next: "clarify" };
  }

  if (stage === "clarify") {
    // Answer based on keywords in the user's message
    let answer = challenge.clarifyAnswers.default;
    if (msg.includes("who") || msg.includes("user") || msg.includes("customer") || msg.includes("audience")) answer = challenge.clarifyAnswers.who || challenge.clarifyAnswers.default;
    else if (msg.includes("why") || msg.includes("reason") || msg.includes("cause")) answer = challenge.clarifyAnswers.why || challenge.clarifyAnswers.default;
    else if (msg.includes("where") || msg.includes("surface") || msg.includes("page") || msg.includes("screen") || msg.includes("drop")) answer = challenge.clarifyAnswers.where || challenge.clarifyAnswers.default;
    else if (msg.includes("metric") || msg.includes("success") || msg.includes("measure") || msg.includes("kpi") || msg.includes("goal")) answer = challenge.clarifyAnswers.metric || challenge.clarifyAnswers.default;
    else if (msg.includes("data") || msg.includes("information") || msg.includes("analytic") || msg.includes("track")) answer = challenge.clarifyAnswers.data || challenge.clarifyAnswers.default;
    else if (msg.includes("current") || msg.includes("today") || msg.includes("now") || msg.includes("existing")) answer = challenge.clarifyAnswers.current || challenge.clarifyAnswers.default;
    else if (msg.includes("how") || msg.includes("flow") || msg.includes("step") || msg.includes("process")) answer = challenge.clarifyAnswers.how || challenge.clarifyAnswers.default;

    const isStartingToDesign = msg.includes("i would") || msg.includes("i'd") || msg.includes("my approach") || msg.includes("start by") || msg.includes("first i") || msg.includes("let me") || msg.includes("think we should") || msg.includes("idea") || msg.includes("design") || msg.includes("propose") || msg.includes("solution");

    if (isStartingToDesign) {
      return { text: `Got it. Go ahead — walk me through your thinking.`, next: "probe1" };
    }

    return { text: `${answer}\n\nAnything else before you start?`, next: "clarify" };
  }

  if (stage === "design") {
    return { text: `Got it. Go ahead — walk me through your thinking.`, next: "probe1" };
  }

  if (stage === "probe1") {
    return { text: challenge.probes[0], next: "probe2" };
  }

  if (stage === "probe2") {
    const probe = challenge.probes[Math.floor(Math.random() * (challenge.probes.length - 1)) + 1];
    return { text: probe, next: "pushback" };
  }

  if (stage === "pushback") {
    return { text: challenge.pushback, next: "wrapup" };
  }

  if (stage === "wrapup") {
    return { text: `${challenge.pushbackFollowup}\n\nI think we've covered a lot of ground. Let me give you some feedback.`, next: "done" };
  }

  if (stage === "done") {
    return { text: challenge.feedback, next: "done", sessionDone: true };
  }

  return { text: "Tell me more about that.", next: stage };
}

// ─── INTERVIEW TAB ────────────────────────────────────────────────────────────

function InterviewTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [stage, setStage] = useState("intro");
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 800) + "px";
  };

  const fakeTypingDelay = (fn, ms = 900) => {
    setLoading(true);
    setTimeout(() => { fn(); setLoading(false); }, ms);
  };

  const startSession = () => {
    const picked = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
    setChallenge(picked);
    setStarted(true);
    fakeTypingDelay(() => {
      const { text, next } = getInterviewerReply(picked, "intro", "");
      setMessages([{ role: "assistant", content: text }]);
      setStage(next);
    }, 1200);
  };

  const sendMessage = () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    fakeTypingDelay(() => {
      const { text, next, sessionDone: done } = getInterviewerReply(challenge, stage, userMsg.content);
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
      setStage(next);
      if (done) setSessionDone(true);
    }, 800 + Math.random() * 600);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const restart = () => {
    setMessages([]); setInput(""); setStarted(false);
    setSessionDone(false); setChallenge(null); setStage("intro");
  };

  return (
    <div className="main-content">
      {!started ? (
        <>
          <div className="tips-row">
            {["Clarify before jumping in", "Narrate your thinking", "Connect design to outcomes"].map(tip => (
              <span key={tip} className="tip-chip">{tip}</span>
            ))}
          </div>
          <button className="start-btn" onClick={startSession}>Begin Session</button>
        </>
      ) : (
        <>
          <div className="chat-area">
            {messages.map((msg, i) => (
              <div key={i} className="message-row">
                <div className={`msg-label ${msg.role === "user" ? "you" : "interviewer"}`}>
                  {msg.role === "user" ? "You" : "Interviewer"}
                </div>
                <div className={`msg-body ${msg.role === "user" ? "you" : ""}`}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="typing-row">
                <div className="msg-label interviewer">Interviewer</div>
                <div className="typing-dots"><span className="dot"/><span className="dot"/><span className="dot"/></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {sessionDone ? (
            <div className="done-section">
              <div className="done-label">Session Complete</div>
              <button className="restart-btn" onClick={restart}>Try Another Challenge</button>
            </div>
          ) : (
            <div className="input-wrap">
              <div className="input-inner">
                <textarea
                  ref={textareaRef}
                  className="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onInput={handleInput}
                  onKeyDown={handleKey}
                  placeholder="Ask a clarifying question, share your thinking, or present your approach…"
                  rows={1}
                />
                <button className="send-btn" onClick={sendMessage} disabled={!input.trim() || loading}>Send ↑</button>
              </div>
              <div className="input-hint">Enter to send · Shift+Enter for new line</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

const HERO_CONTENT = {
  interview: {
    label: "Mock Interview · Live Design Challenge",
    title: <>Practice your<br />design thinking.</>,
    subtitle: "A real design prompt, live pushback, and honest feedback — just like the actual interview.",
  },
  jobs: {
    label: "Role Hunter · Design Jobs",
    title: <>Hunt your next<br />design role.</>,
    subtitle: "Curated product design, UX, and design engineering roles — plus a mock interview to practice design challenges.",
  },
};

export default function App() {
  const [tab, setTab] = useState("jobs");
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const stickyRef = useRef(null);
  const hero = HERO_CONTENT[tab];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep --sticky-h in sync with the sticky wrapper's real height
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--sticky-h", el.offsetHeight + "px");
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fff", fontFamily: "'Georgia', serif", color: "#1a1a1a" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Sticky header wrapper: hero + tabs + (jobs controls) */}
      <div ref={stickyRef} className={`sticky-header${scrolled ? " scrolled" : ""}`}>
        {/* Hero */}
        <div className={`ascii-hero${scrolled ? " compact" : ""}`}>
          {tab === "interview" && <div className="ascii-bg">{ASCII_GRID}</div>}
          <div className="hero-content">
            <div className="hero-label">{hero.label}</div>
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          <button className={`tab-btn ${tab === "jobs" ? "active" : ""}`} onClick={() => setTab("jobs")}>
            Design Jobs
          </button>
          <button className={`tab-btn ${tab === "interview" ? "active" : ""}`} onClick={() => setTab("interview")}>
            Mock Interview
          </button>
        </div>

        {/* Jobs controls live in the sticky band */}
        {tab === "jobs" && (
          <JobsControls
            search={search} setSearch={setSearch}
            areaFilter={areaFilter} setAreaFilter={setAreaFilter}
            companyFilter={companyFilter} setCompanyFilter={setCompanyFilter}
            count={JOBS_SORTED.filter(j => {
              const q = search.toLowerCase();
              return (!q || j.role.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.area.toLowerCase().includes(q) || j.location.toLowerCase().includes(q))
                && (!areaFilter || j.area === areaFilter)
                && (!companyFilter || j.company === companyFilter);
            }).length}
          />
        )}
      </div>

      {/* Content */}
      {tab === "jobs"
        ? <JobsTab search={search} areaFilter={areaFilter} companyFilter={companyFilter} setCompanyFilter={setCompanyFilter} />
        : <InterviewTab />}
    </div>
  );
}
