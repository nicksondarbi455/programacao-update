// Menções no texto de um comentário: a pessoa aparece como @{email@dominio}
const MENTION_RE = /@\{([^}]+)\}/g;

// E-mails mencionados (sem repetição, em minúsculas)
export function extractMentions(body) {
    const found = new Set();
    for (const match of body.matchAll(MENTION_RE)) {
        found.add(match[1].trim().toLowerCase());
    }
    return [...found];
}

// Parte antes do @ do e-mail: "joao.silva@x.com" -> "joao.silva"
export function shortName(email) {
    return (email || '').split('@')[0];
}

// Token que é inserido no texto ao escolher uma pessoa
export function mentionToken(email) {
    return `@{${email}}`;
}

// Texto sem o formato interno das menções (para pré-visualização)
export function plainBody(body) {
    return body.replace(MENTION_RE, (_, email) => `@${shortName(email)}`);
}
