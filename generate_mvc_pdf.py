#!/usr/bin/env python3
"""Generate GSB-Doctors MVC architecture PDF with 4 pages."""

from fpdf import FPDF

class MVCDoc(FPDF):
    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=15)

    def colored_header(self, title, r, g, b):
        """Draw a colored banner with white text."""
        self.set_fill_color(r, g, b)
        self.set_text_color(255, 255, 255)
        self.set_font('Helvetica', 'B', 16)
        self.cell(0, 14, title, fill=True, align='C', new_x='LMARGIN', new_y='NEXT')
        self.ln(6)

    def tech_badges(self):
        """Draw technology badges on the first page."""
        badges = ['Angular 17', 'Express.js', 'Prisma 5', 'MySQL 8', 'Docker', 'JWT Cookie', 'Tailwind CSS', 'HTTPS/TLS']
        self.set_font('Helvetica', '', 9)
        x_start = 15
        x = x_start
        for badge in badges:
            w = self.get_string_width(badge) + 8
            if x + w > 195:
                self.ln(8)
                x = x_start
            self.set_xy(x, self.get_y())
            self.set_draw_color(100, 100, 100)
            self.set_text_color(60, 60, 60)
            self.cell(w, 7, badge, border=1, align='C')
            x += w + 3
        self.ln(12)

    def legend(self):
        """Draw color legend."""
        items = [
            ('Modele', 46, 125, 50),
            ('Vue', 41, 98, 168),
            ('Controleur', 191, 97, 43),
            ('Autres', 105, 73, 134),
        ]
        self.set_font('Helvetica', '', 9)
        x = 40
        for label, r, g, b in items:
            self.set_xy(x, self.get_y())
            self.set_fill_color(r, g, b)
            self.cell(5, 5, '', fill=True)
            self.set_text_color(60, 60, 60)
            self.cell(25, 5, '  ' + label)
            x += 40
        self.ln(10)

    def summary_table(self):
        """Draw the summary table on page 1."""
        headers = ['Categorie', "Role dans l'app", '# Fichiers']
        col_w = [35, 120, 25]

        self.set_font('Helvetica', 'B', 10)
        self.set_fill_color(240, 240, 240)
        self.set_text_color(0, 0, 0)
        for i, h in enumerate(headers):
            self.cell(col_w[i], 8, h, border=1, fill=True, align='C')
        self.ln()

        rows = [
            ('Modele', 'Dump SQL MySQL, schemas SQL securite/audit, schema Prisma introspecte, seed, singleton ORM', '8', 46, 125, 50),
            ('Vue', 'Composants Angular : pages, modals, navbar, routing, bootstrap app', '12', 41, 98, 168),
            ('Controleur', 'Routes Express, middleware JWT, services Angular, intercepteur HTTP', '16', 191, 97, 43),
            ('Autres', 'Docker, TLS, config, tests, documentation, fichiers de dev', '16', 105, 73, 134),
        ]

        self.set_font('Helvetica', '', 9)
        for cat, role, count, r, g, b in rows:
            self.set_text_color(r, g, b)
            self.set_font('Helvetica', 'B', 9)
            self.cell(col_w[0], 8, cat, border=1, align='C')
            self.set_text_color(0, 0, 0)
            self.set_font('Helvetica', '', 8)
            self.cell(col_w[1], 8, role, border=1)
            self.set_font('Helvetica', 'B', 9)
            self.cell(col_w[2], 8, count, border=1, align='C')
            self.ln()

    def data_table(self, headers, col_widths, rows, row_height=None):
        """Draw a data table with word-wrapped cells."""
        # Header
        self.set_font('Helvetica', 'B', 9)
        self.set_fill_color(240, 240, 240)
        self.set_text_color(0, 0, 0)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 8, h, border=1, fill=True, align='C')
        self.ln()

        # Rows
        self.set_font('Helvetica', '', 7.5)
        for row in rows:
            # Calculate max height needed
            max_lines = 1
            cell_texts = []
            for i, text in enumerate(row):
                lines = self._wrap_text(text, col_widths[i] - 2)
                cell_texts.append(lines)
                if len(lines) > max_lines:
                    max_lines = len(lines)

            rh = max(max_lines * 4.2, 7)

            # Check if we need a page break
            if self.get_y() + rh > 280:
                self.add_page()
                # Reprint header
                self.set_font('Helvetica', 'B', 9)
                self.set_fill_color(240, 240, 240)
                for i, h in enumerate(headers):
                    self.cell(col_widths[i], 8, h, border=1, fill=True, align='C')
                self.ln()
                self.set_font('Helvetica', '', 7.5)

            x_start = self.get_x()
            y_start = self.get_y()

            for i, lines in enumerate(cell_texts):
                x = x_start + sum(col_widths[:i])
                self.set_xy(x, y_start)
                # Draw cell border
                self.cell(col_widths[i], rh, '', border=1)
                # Print text lines
                for j, line in enumerate(lines):
                    self.set_xy(x + 1, y_start + 1 + j * 4.2)
                    if i == 0:
                        self.set_font('Courier', '', 6.5)
                    else:
                        self.set_font('Helvetica', '', 7.5)
                    self.cell(col_widths[i] - 2, 4, line)

            self.set_xy(x_start, y_start + rh)

    def _wrap_text(self, text, max_width):
        """Simple word wrap."""
        self.set_font('Helvetica', '', 7.5)
        words = text.split(' ')
        lines = []
        current = ''
        for word in words:
            test = current + (' ' if current else '') + word
            if self.get_string_width(test) <= max_width:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines if lines else ['']


def main():
    pdf = MVCDoc()

    # ========== PAGE 1: Title + Summary ==========
    pdf.add_page()

    # Title
    pdf.set_font('Helvetica', 'B', 28)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 15, 'GSB-Doctors', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 12)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 7, 'Architecture MVC -- Cartographie des fichiers', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 9)
    pdf.cell(0, 6, 'Application de gestion des visites medicales - Express.js + Angular 17 + Prisma + MySQL 8', align='C', new_x='LMARGIN', new_y='NEXT')
    pdf.ln(6)

    # Badges
    pdf.tech_badges()

    # Legend
    pdf.legend()

    # Summary table
    pdf.summary_table()

    pdf.ln(8)

    # -------- MODELE section --------
    pdf.colored_header('1  -- MODELE (Donnees & Persistance)', 46, 125, 50)

    modele_rows = [
        ('sql/sql.sql', 'Dump BDD', 'Dump SQL complet de la base MySQL \'gsbrapports\' : creation des tables visiteur, medecin, rapport, medicament, famille, offrir et INSERT des donnees initiales.'),
        ('sql/audit_log.sql', 'Audit SQL', 'Table audit_log pour le suivi des INSERT/UPDATE/DELETE sur rapport, offrir, medecin et visiteur. Stocke ancien/nouvel etat en JSON.'),
        ('sql/session.sql', 'Session SQL', 'Table session cote serveur liee aux JWT : permet l\'invalidation au logout et l\'expiration a 30 min. Cle UUID v4 stockee dans le JWT.'),
        ('sql/connexions.sql', 'Rate-limit SQL', 'Table connexions : enregistre les tentatives de connexion (succes/echec) par IP. Verrouillage apres 5 echecs pendant 30 secondes.'),
        ('backend/prisma/\nschema.prisma', 'Schema ORM', 'Schema Prisma introspecte (db pull) refletant la structure MySQL : modeles Visiteur, Medecin, Rapport, Medicament, Famille, Offrir, Session, Connexions, AuditLog avec toutes leurs relations.'),
        ('backend/prisma/seed.js', 'Seed script', 'Initialise la BDD : charge sql.sql, elargit la colonne mdp a CHAR(60), cree les tables session/connexions/audit_log, installe les triggers d\'audit et hache les mots de passe avec bcrypt (cout 10).'),
        ('backend/src/lib/\nprisma.js', 'Singleton ORM', 'Exporte un singleton PrismaClient partage par tous les fichiers de routes backend, evitant les connexions multiples.'),
        ('frontend/src/\nenvironments/\nenvironment.ts', 'Config env', 'Definit les variables d\'environnement Angular (production, apiUrl) utilisees par tous les services HTTP.'),
    ]

    pdf.data_table(
        ['Fichier', 'Role', 'Description'],
        [45, 22, 113],
        modele_rows
    )

    # ========== PAGE 2: VUE ==========
    pdf.add_page()
    pdf.colored_header('2  -- VUE (Interface Utilisateur Angular 17)', 41, 98, 168)

    vue_rows = [
        ('app.component.ts', 'Racine', 'Composant racine Angular : contient la navbar et le <router-outlet>. Point d\'entree visuel de l\'application.'),
        ('app.config.ts', 'Bootstrap', 'Configuration Angular : declare APP_INITIALIZER (appel GET /api/auth/me au demarrage), injecte l\'intercepteur HTTP et configure le router.'),
        ('app.routes.ts', 'Routage', 'Definit toutes les routes Angular avec AuthGuard et lazy loading : /login, /register, / (dashboard), /medecins, /rapports/new, /rapports/:id, /rapports/:id/edit.'),
        ('features/auth/\nlogin.component.ts', 'Page Auth', 'Formulaire de connexion : champs login/mdp, appel AuthService.login(), redirection vers / en cas de succes. Gere l\'affichage des erreurs (rate-limit 429 inclus).'),
        ('features/auth/\nregister.component.ts', 'Page Auth', 'Formulaire d\'inscription : nom, prenom, login, mdp, adresse, CP, ville, dateEmbauche. Cree un nouveau visiteur via POST /api/auth/register avec validation cote client.'),
        ('features/dashboard/\ndashboard.component.ts', 'Page Dashboard', 'Tableau de bord personnel : affiche les medecins suivis (tries par nombre de rapports) et la liste complete des rapports du visiteur avec recherche et navigation.'),
        ('features/medecins/\nmedecins.component.ts', 'Page Medecins', 'Liste paginee de medecins avec champ de recherche (nom/prenom). Ouvre le modal de detail au clic. Supporte la suppression et la modification.'),
        ('features/medecins/\ndoctor-detail-\nmodal.component.ts', 'Modal', 'Modal de detail d\'un medecin : affiche adresse, telephone, specialite et l\'historique des rapports du visiteur connecte pour ce medecin. Permet la modification adresse/tel.'),
        ('features/rapports/\nrapport-detail.\ncomponent.ts', 'Page Rapport', 'Vue detaillee d\'un rapport : date, motif, bilan, medecin concerne et liste des echantillons associes avec leurs quantites. Lien vers le modal medicament.'),
        ('features/rapports/\nrapport-form.\ncomponent.ts', 'Formulaire', 'Formulaire de creation et modification de rapport : selection du medecin, date, motif, bilan et gestion dynamique des echantillons (ajout/suppression/quantite).'),
        ('features/rapports/\nmedicament-detail-\nmodal.component.ts', 'Modal', 'Popup d\'information sur un medicament : composition, effets, contre-indications et famille therapeutique.'),
        ('shared/navbar/\nnavbar.component.ts', 'Composant UI', 'Barre de navigation globale : liens Dashboard, Medecins, Rapports et bouton Deconnexion. Affiche le nom du visiteur connecte.'),
    ]

    pdf.data_table(
        ['Fichier', 'Role', 'Description'],
        [45, 25, 110],
        vue_rows
    )

    # ========== PAGE 3: CONTROLEUR ==========
    pdf.add_page()
    pdf.colored_header('3  -- CONTROLEUR (API Express + Services Angular)', 191, 97, 43)

    ctrl_rows = [
        ('backend/src/app.js', 'App Express', 'Configure Express : CORS origin/credentials, cookie-parser, body JSON, health check, monte toutes les routes sous /api, gestion d\'erreurs globale.'),
        ('backend/src/index.js', 'Point d\'entree', 'Demarre le serveur HTTPS avec les certificats TLS (certs/key.pem, cert.pem) sur le PORT configure (defaut 3001).'),
        ('backend/src/\nmiddleware/auth.js', 'Middleware JWT', 'Verifie le cookie httpOnly \'token\', decode le JWT, valide la session cote serveur (table session). Retourne 401 si absent, invalide ou session expiree.'),
        ('backend/src/routes/\nauth.js', 'Route Auth', 'POST /login (bcrypt compare, rate-limit IP, creation session, pose cookie JWT httpOnly), /register (validation, hash, insert, session), /logout (invalidation session, efface cookie), GET /me.'),
        ('backend/src/routes/\nmedecins.js', 'Route Medecins', 'GET /api/medecins (pagination, filtre search LIKE). GET /:id (rapports du visiteur). PATCH /:id (modification adresse/tel). DELETE /:id (cascade offrir/rapports/medecin en transaction).'),
        ('backend/src/routes/\nrapports.js', 'Route Rapports', 'CRUD complet : GET (liste + filtres search/sortDate/sortMotif/sortNom + recherche date), GET /:id (403 si non auteur), POST (transaction Prisma avec offrir), PUT (replace echantillons), DELETE (transaction).'),
        ('backend/src/routes/\nmedicaments.js', 'Route Medic.', 'GET /api/medicaments avec filtre search sur nomCommercial et libelle famille. GET /:id avec composition, effets et contre-indications.'),
        ('backend/src/routes/\ndashboard.js', 'Route Dashboard', 'GET /api/dashboard : calcule medecinsSuivis (medecins avec rapports du visiteur, tries par rapportCount desc) et mesRapports (tries par date desc).'),
        ('core/guards/\nauth.guard.ts', 'Guard Angular', 'CanActivateFn : verifie l\'etat du BehaviorSubject AuthService. Redirige vers /login si le visiteur n\'est pas authentifie.'),
        ('core/interceptors/\nauth.interceptor.ts', 'Intercepteur', 'Ajoute withCredentials:true sur toutes les requetes HTTP Angular pour transmettre le cookie JWT. Intercepte les erreurs 401 et redirige vers /login.'),
        ('core/services/\nauth.service.ts', 'Service Auth', 'BehaviorSubject visiteur$, methodes login(), logout(), me(), register(). APP_INITIALIZER appelle me() au demarrage pour rehydrater l\'etat sans redirection.'),
        ('core/services/\ndashboard.service.ts', 'Service', 'Encapsule GET /api/dashboard, retourne Observable<DashboardData> avec medecinsSuivis et mesRapports. Definit les interfaces TypeScript.'),
        ('core/services/\nmedecin.service.ts', 'Service', 'Encapsule GET /api/medecins (search/page/limit), GET /:id, PATCH /:id et DELETE /:id. Retourne Observables types avec interfaces Medecin et MedecinDetail.'),
        ('core/services/\nrapport.service.ts', 'Service', 'CRUD rapports : getAll(), getById(), create(), update(), delete(). Gere les parametres de tri et de recherche. Definit interfaces RapportDetail et EchantillonInput.'),
        ('core/services/\nmedicament.service.ts', 'Service', 'Encapsule GET /api/medicaments (search) et GET /:id pour la recherche d\'echantillons dans le formulaire rapport.'),
        ('frontend/proxy.\nconf.json', 'Proxy Dev', 'Redirige les appels /api vers https://localhost:3001 en developpement, avec secure:false pour le certificat auto-signe.'),
    ]

    pdf.data_table(
        ['Fichier', 'Role', 'Description'],
        [40, 25, 115],
        ctrl_rows
    )

    # ========== PAGE 4: AUTRES ==========
    pdf.add_page()
    pdf.colored_header('4  -- AUTRES (Infrastructure, Config, Tests & Documentation)', 105, 73, 134)

    autres_rows = [
        ('docker-compose.yml', 'Docker', 'Lance MySQL 8 sur le port 3306 avec les identifiants gsb/gsb, le volume persistant pour la base \'gsbrapports\' et l\'option log-bin-trust-function-creators pour les triggers.'),
        ('certs/generate.js', 'TLS', 'Genere un certificat TLS auto-signe (key.pem + cert.pem) pour HTTPS local. Utilise openssl si disponible, sinon fallback pur Node.js avec ASN.1/DER.'),
        ('.env.example', 'Config', 'Template des variables d\'environnement backend : DATABASE_URL (MySQL), JWT_SECRET et PORT=3001.'),
        ('backend/.env', 'Config', 'Variables d\'environnement reelles du backend (non commite, exclue par .gitignore). Contient DATABASE_URL, JWT_SECRET et PORT.'),
        ('.gitignore', 'Config Git', 'Exclut .env, node_modules/, dist/, *.db des commits.'),
        ('backend/package.json', 'Deps backend', 'Dependances backend : express, prisma, bcrypt, jsonwebtoken, cookie-parser, cors, mysql2. Scripts : start, seed, test, generate-cert.'),
        ('frontend/package.json', 'Deps frontend', 'Dependances frontend : Angular 17, Tailwind CSS, RxJS. Scripts : start (ng serve avec proxy HTTPS), build, test.'),
        ('frontend/angular.json', 'Config Angular', 'Configuration du workspace Angular : build, serve (avec proxyConfig), test. Definit les assets, styles et scripts.'),
        ('frontend/tailwind.\nconfig.js', 'Config CSS', 'Configuration Tailwind CSS : scan des fichiers HTML et TS dans src/ pour la purge des styles inutilises.'),
        ('frontend/tsconfig.json', 'Config TS', 'Configuration TypeScript racine du frontend : target ES2022, strict mode, paths et options de compilation Angular.'),
        ('backend/tests/\nauth.test.js', 'Test', 'Tests unitaires Jest pour les routes d\'authentification : login, register, logout, /me. Mock Prisma et bcrypt.'),
        ('backend/tests/\nhttps.test.js', 'Test', 'Tests de verification du serveur HTTPS : certificats TLS, connexion securisee, headers de securite.'),
        ('backend/tests/\nmedecins.test.js', 'Test', 'Tests unitaires Jest pour les routes medecins : GET liste/detail, PATCH modification, DELETE cascade.'),
        ('backend/tests/\nrapports.test.js', 'Test', 'Tests unitaires Jest pour le CRUD rapports : creation avec echantillons, modification, suppression, controle d\'acces 403.'),
        ('backend/tests/\nsession-connexions.\ntest.js', 'Test', 'Tests des sessions serveur et du rate-limiting : creation/invalidation de session, verrouillage IP apres 5 echecs.'),
        ('frontend/src/app/\n*.spec.ts (x3)', 'Test', 'Tests unitaires Angular (Karma) : AppComponent, AuthService et RapportService. Utilisent HttpTestingController pour mocker les appels HTTP.'),
        ('README.md', 'Doc', 'Documentation principale : presentation, prerequis, installation, identifiants de demo, stack technique, structure du projet, documentation API, guide TLS.'),
        ('docs/guide-\nutilisateur.md', 'Doc', 'Guide utilisateur complet : connexion, inscription, dashboard, medecins, rapports, medicaments. Avec captures d\'ecran.'),
        ('docs/screenshots/', 'Doc', 'Maquettes de reference (wireframes PNG) : connexion, inscription, dashboard, liste medecins, details medecin, details medicament, formulaire rapport.'),
    ]

    pdf.data_table(
        ['Fichier', 'Role', 'Description'],
        [40, 20, 120],
        autres_rows
    )

    # Save
    output_path = 'c:/GSB-doctors/GSB-doctors_MVC.pdf'
    pdf.output(output_path)
    print(f'PDF generated: {output_path}')


if __name__ == '__main__':
    main()
