# Configuration Supabase pour Pixel Art

## 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet

## 2. Créer la table pixels

Dans l'éditeur SQL de Supabase, exécutez :

```sql
CREATE TABLE pixels (
  room text NOT NULL,
  x integer NOT NULL,
  y integer NOT NULL,
  color text NOT NULL,
  author text,
  timestamp timestamptz DEFAULT now(),
  PRIMARY KEY (room, x, y)
);

-- Activer les changements en temps réel
ALTER TABLE pixels REPLICA IDENTITY FULL;

-- Autoriser l'accès anonyme (pour la démo)
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for demo" ON pixels
FOR ALL USING (true) WITH CHECK (true);
```

## 2.1 IMPORTANT: Activer Realtime

Option 1 - Via l'interface:
1. Dans Supabase Dashboard, allez dans **Database > Tables**
2. Cliquez sur la table **pixels**
3. Cliquez sur **"Realtime off"** en haut
4. Activez le toggle **"Enable Realtime"**

Option 2 - Via SQL:
```sql
-- Activer realtime pour la table pixels
ALTER PUBLICATION supabase_realtime ADD TABLE pixels;
```

Sans cette étape, les changements ne se synchroniseront pas en temps réel!

## 3. Configurer l'application

1. Dans Supabase, allez dans Settings > API
2. Copiez votre URL du projet et la clé anonyme
3. Modifiez `supabase-config.js` :

```javascript
export const SUPABASE_URL = 'https://votreprojet.supabase.co'
export const SUPABASE_ANON_KEY = 'votre-cle-anon'
```

## 4. Lancer l'application

```bash
npm run dev
```

Ouvrez deux navigateurs sur http://localhost:5173, connectez-vous à la même room, et les pixels se synchroniseront via Supabase !