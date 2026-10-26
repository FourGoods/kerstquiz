const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

let actieveDeelnemers = [];
let huidigeVraagIndex = -1;
let toonEindstand = false;
let quizAntwoorden = {}; 
let ingediendeAntwoordenPerVraag = {};

io.on('connection', (socket) => {
    socket.emit('update-status', {
        huidigeVraagIndex,
        toonEindstand,
        actieveDeelnemers,
        alleAntwoorden: quizAntwoorden
    });

    socket.on('registreer-deelnemer', (naam) => {
        if (!actieveDeelnemers.includes(naam)) {
            actieveDeelnemers.push(naam);
        }
        io.emit('update-deelnemers', actieveDeelnemers);
    });

    socket.on('volgende-vraag', (nieuweIndex) => {
        huidigeVraagIndex = nieuweIndex;
        toonEindstand = false;
        
        // Zorg dat de inzendingen voor deze specifieke nieuwe vraag gegarandeerd leeg zijn!
        ingediendeAntwoordenPerVraag[huidigeVraagIndex] = [];

        io.emit('zet-vraag', huidigeVraagIndex);
        io.emit('update-status', {
            huidigeVraagIndex,
            toonEindstand,
            actieveDeelnemers,
            alleAntwoorden: quizAntwoorden
        });

        // Stuur direct een schone 0-telling naar de host
        io.emit('update-ingezonden', {
            vraagIndex: huidigeVraagIndex,
            aantal: 0,
            totaal: actieveDeelnemers.length,
            alleAntwoorden: quizAntwoorden
        });
    });

    socket.on('toon-eindstand', () => {
        toonEindstand = true;
        huidigeVraagIndex = 999;
        io.emit('update-status', {
            huidigeVraagIndex,
            toonEindstand,
            actieveDeelnemers,
            alleAntwoorden: quizAntwoorden
        });
    });

    socket.on('sla-antwoord op', ({ naam, vraagIndex, antwoord }) => {
        if (!quizAntwoorden[naam]) quizAntwoorden[naam] = {};
        quizAntwoorden[naam][vraagIndex] = antwoord;

        if (!ingediendeAntwoordenPerVraag[vraagIndex]) {
            ingediendeAntwoordenPerVraag[vraagIndex] = [];
        }
        if (!ingediendeAntwoordenPerVraag[vraagIndex].includes(naam)) {
            ingediendeAntwoordenPerVraag[vraagIndex].push(naam);
        }

        io.emit('update-ingezonden', {
            vraagIndex,
            aantal: ingediendeAntwoordenPerVraag[vraagIndex].length,
            totaal: actieveDeelnemers.length,
            alleAntwoorden: quizAntwoorden
        });
    });

    socket.on('reset-quiz', () => {
        huidigeVraagIndex = -1;
        toonEindstand = false;
        actieveDeelnemers = [];
        quizAntwoorden = {};
        ingediendeAntwoordenPerVraag = {};
        io.emit('quiz-gereset');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server draait op http://localhost:${PORT}`);
});