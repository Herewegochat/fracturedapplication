// lib/discord-id.ts
function validDiscordId(value) {
  return typeof value === "string" && /^[1-9][0-9]{16,19}$/.test(value) && (value.length < 20 || value <= "18446744073709551615");
}

// lib/questions.ts
var questions = [
  "Why do you want to join the Oxford Response API support team, and what would you like to learn as an intern?",
  "A server owner opens a ticket saying, \u201CMy units aren\u2019t showing on the live map.\u201D What would your first reply be?",
  "Someone asks where to enter their API key. How would you guide them through setup while keeping their key private?",
  "You\u2019ve tried the usual checks, but the issue keeps happening. When would you escalate the ticket, and what details would you pass to senior staff?",
  "A server owner is frustrated because their session starts in five minutes and they\u2019re still waiting for a fix. What would you say to them?"
];

// lib/applications.ts
async function apply(request, webhook) {
  const fail = (error, status) => Response.json({ error }, { status });
  if (request.method !== "POST") return fail("Use the application form to submit.", 405);
  if (request.headers.get("origin") !== new URL(request.url).origin) return fail("Reload the form and try again.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Invalid application.", 415);
  const data = await request.json().catch(() => null);
  const valid = (v, max) => typeof v === "string" && v.trim() && v.length <= max;
  if (!validDiscordId(data?.discordId) || !Array.isArray(data?.answers) || data.answers.length !== 5 || !data.answers.every((a) => valid(a, 950))) return fail("Enter your Discord user ID and answer all five questions.", 400);
  if (!webhook) return fail("Applications are temporarily unavailable.", 503);
  const url = new URL(webhook);
  url.searchParams.set("wait", "true");
  const answers = data.answers;
  const receipt = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    content: `<@${data.discordId}>`,
    allowed_mentions: { parse: [], users: [data.discordId] },
    embeds: [{
      author: { name: "Oxford Response API  /  Recruitment" },
      title: "Support intern application",
      description: `**Applicant**  <@${data.discordId}>
**Discord ID**  \`${data.discordId}\``,
      color: 6589439,
      fields: questions.map((question, index) => ({
        name: String(index + 1).padStart(2, "0") + "  \xB7  " + question,
        value: answers[index].trim()
      })),
      footer: { text: "Support team  \u2022  Submitted" },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }]
  }) }).catch(() => null);
  if (!receipt?.ok) return fail("Discord could not confirm delivery. Your answers are still here. Please try again shortly.", 503);
  return Response.json({ ok: true });
}

// api/applications.ts
var config = { runtime: "edge" };
function handler(request) {
  return apply(request, process.env.DISCORD_WEBHOOK_URL);
}
export {
  config,
  handler as default
};
