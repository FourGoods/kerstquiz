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
        
        // Alleen voor echte vragen (dus niet de overzichtsschermen -101 of -105) initialiseren we de teller
        if (nieuweIndex >= 0 && nieuweIndex < 999) {
            if (!ingediendeAntwoordenPerVraag[huidigeVraagIndex]) {
                ingediendeAntwoordenPerVraag[huidigeVraagIndex] = [];
            }
        }

        // Stuur de nieuwe index direct naar ALLE clients (host én deelnemers)
        io.emit('zet-vraag', huidigeVraagIndex);
        io.emit('update-status', {
            huidigeVraagIndex,
            toonEindstand,
            actieveDeelnemers,
            alleAntwoorden: quizAntwoorden
        });

        // Als het een echte vraag is, stuur direct de 0-telling mee
        if (nieuweIndex >= 0 && nieuweIndex < 999) {
            io.emit('update-ingezonden', {
                vraagIndex: huidigeVraagIndex,
                aantal: 0,
                totaal: actieveDeelnemers.length,
                alleAntwoorden: quizAntwoorden
            });
        }
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
