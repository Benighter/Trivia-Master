// Constants
const API_URL = 'https://opentdb.com/api.php';
const CATEGORY_URL = 'https://opentdb.com/api_category.php';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Game state
let currentQuestion = 0;
let score = 0;
let questions = [];
let incorrectQuestions = [];
let userAnswers = [];

// DOM Elements
const app = document.getElementById('app');
const screens = document.querySelectorAll('.screen');
const startGameBtn = document.getElementById('start-game');
const viewHighScoresBtn = document.getElementById('view-high-scores');
const learnModeBtn = document.getElementById('learn-mode');
const categorySelect = document.getElementById('category-select');
const difficultySelect = document.getElementById('difficulty-select');
const questionCountSelect = document.getElementById('question-count');
const startGameSetupBtn = document.getElementById('start-game-btn');
const progressBar = document.getElementById('progress-bar');
const questionContainer = document.getElementById('question-container');
const answerContainer = document.getElementById('answer-container');
const finalScoreElement = document.getElementById('final-score');
const incorrectQuestionsElement = document.getElementById('incorrect-questions');
const reviewAllBtn = document.getElementById('review-all');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score');
const returnToMenuBtn = document.getElementById('return-to-menu');
const playAgainBtn = document.getElementById('play-again');
const highScoresList = document.getElementById('high-scores-list');
const backToMenuBtn = document.getElementById('back-to-menu');
const learnCategorySelect = document.getElementById('learn-category-select');
const learnDifficultySelect = document.getElementById('learn-difficulty-select');
const learnQuestionsContainer = document.getElementById('learn-questions-container');
const learnBackToMenuBtn = document.getElementById('learn-back-to-menu');
const resignButton = document.getElementById('resign-button');

// Theme switching elements
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Event Listeners
startGameBtn.addEventListener('click', () => showScreen('game-setup'));
viewHighScoresBtn.addEventListener('click', () => {
    showHighScores();
    showScreen('high-scores');
});
learnModeBtn.addEventListener('click', () => showScreen('learn-mode-screen'));
startGameSetupBtn.addEventListener('click', startGame);
reviewAllBtn.addEventListener('click', reviewAllQuestions);
saveScoreBtn.addEventListener('click', saveScore);
returnToMenuBtn.addEventListener('click', () => showScreen('main-menu'));
playAgainBtn.addEventListener('click', () => showScreen('game-setup'));
backToMenuBtn.addEventListener('click', () => showScreen('main-menu'));
learnBackToMenuBtn.addEventListener('click', () => showScreen('main-menu'));
themeToggle.addEventListener('click', toggleTheme);
resignButton.addEventListener('click', resignGame);

// Initialize the game
initializeGame();

async function initializeGame() {
    setInitialTheme();
    await loadCategories();
    loadLearnModeListeners();
    initializeHighScores();
}

function setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
    } else {
        body.classList.add('light-theme');
    }
}

function toggleTheme() {
    if (body.classList.contains('light-theme')) {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    }
}

async function loadCategories() {
    try {
        const response = await fetch(CATEGORY_URL);
        const data = await response.json();
        populateCategorySelect(categorySelect, data.trivia_categories);
        populateCategorySelect(learnCategorySelect, data.trivia_categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories. Please try again later.');
    }
}

function populateCategorySelect(select, categories) {
    select.innerHTML = '<option value="">Any Category</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
}

function loadLearnModeListeners() {
    learnCategorySelect.addEventListener('change', loadLearnModeQuestions);
    learnDifficultySelect.addEventListener('change', loadLearnModeQuestions);
}

async function loadLearnModeQuestions() {
    const category = learnCategorySelect.value;
    const difficulty = learnDifficultySelect.value;
    learnQuestionsContainer.innerHTML = 'Loading questions...';
    try {
        const questions = await fetchQuestions(50, category, difficulty);
        if (questions.length === 0) {
            learnQuestionsContainer.innerHTML = 'No questions found for the selected criteria. Try different options.';
        } else {
            displayLearnModeQuestions(questions);
        }
    } catch (error) {
        console.error('Error loading learn mode questions:', error);
        learnQuestionsContainer.innerHTML = 'Failed to load questions. Please try again later.';
    }
}

async function startGame() {
    currentQuestion = 0;
    score = 0;
    incorrectQuestions = [];
    userAnswers = [];
    const category = categorySelect.value;
    const difficulty = difficultySelect.value;
    const amount = questionCountSelect.value;

    try {
        questions = await fetchQuestions(amount, category, difficulty);
        showScreen('gameplay');
        displayQuestion();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Failed to start the game. Please try again later.');
    }
}

function resignGame() {
    if (confirm('Are you sure you want to resign? Your progress will be lost.')) {
        resetGame();
        showScreen('main-menu');
    }
}

function resetGame() {
    currentQuestion = 0;
    score = 0;
    questions = [];
    incorrectQuestions = [];
    userAnswers = [];
    resignButton.style.display = 'none';
}

function endGame() {
    showScreen('end-game');
    finalScoreElement.textContent = `Your Score: ${score} / ${questions.length}`;
    displayIncorrectQuestions();
}

async function fetchQuestions(amount, category, difficulty) {
    const cacheKey = `trivia_${amount}_${category}_${difficulty}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        const { timestamp, questions } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return questions;
        }
    }

    let url = `${API_URL}?amount=${amount}`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;
    url += '&encode=base64';

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();

    if (data.response_code !== 0) {
        console.error('API returned an error:', data.response_code);
        return [];
    }

    const decodedQuestions = data.results.map(q => ({
        ...q,
        question: atob(q.question),
        correct_answer: atob(q.correct_answer),
        incorrect_answers: q.incorrect_answers.map(atob)
    }));

    localStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        questions: decodedQuestions
    }));

    return decodedQuestions;
}

function displayQuestion() {
    const question = questions[currentQuestion];
    questionContainer.innerHTML = question.question;
    answerContainer.innerHTML = '';

    const answers = [...question.incorrect_answers, question.correct_answer];
    shuffleArray(answers);

    answers.forEach((answer, index) => {
        const answerOption = document.createElement('div');
        answerOption.classList.add('answer-option');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'answer';
        radio.id = `answer${index}`;
        radio.value = answer;

        const label = document.createElement('label');
        label.htmlFor = `answer${index}`;
        label.textContent = answer;

        answerOption.appendChild(radio);
        answerOption.appendChild(label);
        answerContainer.appendChild(answerOption);
    });

    const submitButton = document.createElement('button');
    submitButton.id = 'submit-answer';
    submitButton.classList.add('btn', 'btn-primary');
    submitButton.textContent = 'Submit Answer';
    submitButton.addEventListener('click', submitAnswer);
    answerContainer.appendChild(submitButton);

    updateProgressBar();
}

function submitAnswer() {
    const selectedAnswer = document.querySelector('input[name="answer"]:checked');
    if (!selectedAnswer) {
        alert('Please select an answer before submitting.');
        return;
    }

    checkAnswer(selectedAnswer.value, questions[currentQuestion].correct_answer);
}

function checkAnswer(selectedAnswer, correctAnswer) {
    userAnswers.push(selectedAnswer);
    if (selectedAnswer === correctAnswer) {
        score++;
    } else {
        incorrectQuestions.push({
            question: questions[currentQuestion].question,
            userAnswer: selectedAnswer,
            correctAnswer: correctAnswer
        });
    }

    currentQuestion++;

    if (currentQuestion < questions.length) {
        displayQuestion();
    } else {
        endGame();
    }
}

function updateProgressBar() {
    const progress = (currentQuestion / questions.length) * 100;
    progressBar.style.width = `${progress}%`;
}

function displayIncorrectQuestions() {
    incorrectQuestionsElement.innerHTML = '';
    incorrectQuestions.forEach((q, index) => {
        const questionElement = document.createElement('div');
        questionElement.innerHTML = `
            <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
            <p><strong>Your Answer:</strong> ${q.userAnswer}</p>
            <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
        `;
        incorrectQuestionsElement.appendChild(questionElement);
    });
}

function reviewAllQuestions() {
    incorrectQuestionsElement.innerHTML = '';
    questions.forEach((q, index) => {
        const questionElement = document.createElement('div');
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === q.correct_answer;
        
        questionElement.innerHTML = `
            <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
            <p><strong>Your Answer:</strong> ${userAnswer} ${isCorrect ? '✅' : '❌'}</p>
            <p><strong>Correct Answer:</strong> ${q.correct_answer}</p>
            <p><strong>All Answers:</strong> ${[...q.incorrect_answers, q.correct_answer].join(', ')}</p>
        `;
        questionElement.style.marginBottom = '20px';
        questionElement.style.padding = '10px';
        questionElement.style.border = '1px solid var(--border-color)';
        questionElement.style.borderRadius = '4px';
        questionElement.style.backgroundColor = isCorrect ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
        
        incorrectQuestionsElement.appendChild(questionElement);
    });
}

function clearHighScores() {
    localStorage.removeItem('highScores');
}

function saveScore() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter your name to save the score.');
        return;
    }

    const highScores = getHighScores();
    const newScore = { name: playerName, score: score, questions: questions.length };
    highScores.push(newScore);
    highScores.sort((a, b) => (b.score / b.questions) - (a.score / a.questions));
    highScores.splice(10); // Keep only top 10 scores

    localStorage.setItem('highScores', JSON.stringify(highScores));
    alert('Score saved successfully!');
    showHighScores();
}

function getHighScores() {
    try {
        const scores = JSON.parse(localStorage.getItem('highScores') || '[]');
        return Array.isArray(scores) ? scores : [];
    } catch (error) {
        console.error('Error parsing high scores:', error);
        return [];
    }
}

function showHighScores() {
    const highScores = getHighScores();
    highScoresList.innerHTML = '';
    
    if (highScores.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No high scores yet!';
        highScoresList.appendChild(li);
    } else {
        highScores.forEach((entry, index) => {
            if (entry && typeof entry.score === 'number' && typeof entry.questions === 'number') {
                const li = document.createElement('li');
                const scorePercentage = ((entry.score / entry.questions) * 100).toFixed(2);
                li.textContent = `${index + 1}. ${entry.name}: ${entry.score}/${entry.questions} (${scorePercentage}%)`;
                highScoresList.appendChild(li);
            }
        });
    }
}

function initializeHighScores() {
    const highScores = getHighScores();
    if (highScores.length === 0) {
        clearHighScores(); // Clear any potential corrupted data
    }
    showHighScores();
}

function showScreen(screenId) {
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    
    if (screenId === 'main-menu') {
        resetGame();
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function displayLearnModeQuestions(questions) {
    learnQuestionsContainer.innerHTML = '';
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${question.question}</p>
            <p><strong>Correct Answer:</strong> ${question.correct_answer}</p>
            <p><strong>Incorrect Answers:</strong> ${question.incorrect_answers.join(', ')}</p>
        `;
        learnQuestionsContainer.appendChild(questionElement);
    });
}

// Error handling and offline mode
window.addEventListener('online', () => {
    console.log('Back online');
    document.body.style.opacity = '1';
    initializeGame();
});

window.addEventListener('offline', () => {
    console.log('Offline');
    document.body.style.opacity = '0.5';
    alert('You are offline. Some features may be limited.');
});

// Keyboard navigation
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && document.activeElement.tagName === 'BUTTON') {
        document.activeElement.click();
    }
});

// Accessibility
document.querySelectorAll('button, select').forEach(element => {
    if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', element.textContent);
    }
});