# flibusta-mcp

[![npm version](https://img.shields.io/npm/v/flibusta-mcp)](https://www.npmjs.com/package/flibusta-mcp)
[![GitHub](https://img.shields.io/badge/GitHub-vonavikon%2Fflibusta--mcp-181717?logo=github)](https://github.com/vonavikon/flibusta-mcp)

[RU](README.ru.md) · [EN](README.md) · [中文](README.zh.md) · [Español](README.es.md) · **Français**

Serveur MCP pour chercher et télécharger des livres sur [Flibusta](https://flibusta.is). Fonctionne avec Claude Code, Claude Desktop et Cursor.

Le serveur n'a pas de LLM propre et ne demande aucune clé d'API. C'est le client appelant qui analyse la requête et transmet `title` et `author` déjà structurés.

## Ce que fait le serveur

- `search_books` cherche par titre et par auteur et renvoie une liste classée : id, titre, auteur, formats, taille, nombre de téléchargements, description courte.
- `download_book` télécharge le livre au format demandé dans le dossier de téléchargements et renvoie le chemin. Les formats `fb2/txt/rtf/html/doc` arrivent de Flibusta dans des archives zip et sont décompressés automatiquement ; `epub/mobi/pdf` sont enregistrés tels quels.

Le classement est déterministe. La correspondance exacte du titre arrive en premier ; si plusieurs éditions correspondent, la plus populaire passe devant.

## Installation

### Claude Code

Publié sur npm :

```bash
claude mcp add flibusta -- npx -y flibusta-mcp
```

Ou compilation locale à partir d'un clone :

```bash
git clone https://github.com/vonavikon/flibusta-mcp.git
cd flibusta-mcp
npm install && npm run build
claude mcp add flibusta -- node "$PWD/dist/index.js"
```

### Claude Desktop

Ajoutez le serveur à `claude_desktop_config.json`. Sous macOS, c'est `~/Library/Application Support/Claude/claude_desktop_config.json` ; sous Windows, `%APPDATA%\Claude\claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "flibusta": {
      "command": "npx",
      "args": ["-y", "flibusta-mcp"]
    }
  }
}
```

### Cursor

Dans `~/.cursor/mcp.json` :

```json
{
  "mcpServers": {
    "flibusta": { "command": "npx", "args": ["-y", "flibusta-mcp"] }
  }
}
```

## Variables d'environnement

| Variable | Valeur par défaut | Description |
|---|---|---|
| `FLIBUSTA_BASE` | `https://flibusta.is` | Miroir principal de Flibusta |
| `FLIBUSTA_FALLBACK_BASE` | non définie | Miroir de secours utilisé quand le principal ne répond pas |
| `FLIBUSTA_DOWNLOAD_DIR` | `~/Downloads` | Où sont enregistrés les livres téléchargés |

Pour Claude Desktop, les variables se définissent dans le champ `env` de la configuration du serveur.

## Utilisation

Une fois le serveur connecté, formulez votre demande au client en toutes lettres :

> Trouve «Dune» de Frank Herbert et télécharge-le en fb2.

Le client appelle `search_books`, choisit l'édition et le format qui conviennent, puis `download_book` enregistre le fichier dans le dossier de téléchargements et renvoie le chemin.

## Développement

```bash
npm install      # dependencies
npm test         # unit tests (vitest)
npm run build    # build into dist/
```

Vous pouvez tester le serveur manuellement avec MCP Inspector :

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Organisation des sources :

- `src/flibusta.ts` interroge Flibusta via OPDS (le paquet `flibusta`), normalise la réponse et en extrait les id.
- `src/rank.ts` gère le classement déterministe.
- `src/download.ts` télécharge le livre et décompresse l'archive zip.
- `src/index.ts` démarre le serveur MCP et enregistre les outils.

## Note juridique

Flibusta diffuse des livres à des conditions jugées différemment selon les juridictions. Utilisez-le à vos risques et périls et dans le respect des lois applicables. Le serveur n'est qu'un client léger au-dessus d'un flux OPDS public ; il ne stocke rien.

## Licence

MIT © vonavikon
