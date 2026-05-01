const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./Models/Category');
const Question = require('./Models/Question');

dotenv.config();

const questionsByCategory = {
  Science: [
    { text: 'What is the chemical symbol for water?', options: ['H2O', 'CO2', 'O2', 'NaCl'], correctAnswer: 'H2O', difficulty: 'easy' },
    { text: 'How many bones are in the adult human body?', options: ['206', '186', '226', '196'], correctAnswer: '206', difficulty: 'medium' },
    { text: 'What planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correctAnswer: 'Mars', difficulty: 'easy' },
    { text: 'What is the speed of light?', options: ['3×10⁸ m/s', '3×10⁶ m/s', '3×10¹⁰ m/s', '3×10⁴ m/s'], correctAnswer: '3×10⁸ m/s', difficulty: 'medium' },
    { text: 'What is the powerhouse of the cell?', options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Chloroplast'], correctAnswer: 'Mitochondria', difficulty: 'easy' },
    { text: 'What gas do plants absorb during photosynthesis?', options: ['CO2', 'O2', 'N2', 'H2'], correctAnswer: 'CO2', difficulty: 'easy' },
    { text: 'What is the atomic number of carbon?', options: ['6', '8', '12', '4'], correctAnswer: '6', difficulty: 'medium' },
    { text: 'Which part of the brain controls balance?', options: ['Cerebellum', 'Cerebrum', 'Medulla', 'Thalamus'], correctAnswer: 'Cerebellum', difficulty: 'medium' },
    { text: 'What is the most abundant gas in Earth\'s atmosphere?', options: ['Nitrogen', 'Oxygen', 'Carbon Dioxide', 'Argon'], correctAnswer: 'Nitrogen', difficulty: 'easy' },
    { text: 'What force keeps planets in orbit around the sun?', options: ['Gravity', 'Magnetism', 'Friction', 'Nuclear force'], correctAnswer: 'Gravity', difficulty: 'easy' },
    { text: 'What is the unit of electrical resistance?', options: ['Ohm', 'Volt', 'Ampere', 'Watt'], correctAnswer: 'Ohm', difficulty: 'medium' },
    { text: 'Which element has the symbol Fe?', options: ['Iron', 'Fluorine', 'Francium', 'Fermium'], correctAnswer: 'Iron', difficulty: 'medium' },
    { text: 'What is the process of a liquid turning into gas called?', options: ['Evaporation', 'Condensation', 'Sublimation', 'Freezing'], correctAnswer: 'Evaporation', difficulty: 'easy' },
    { text: 'How many chromosomes do humans normally have?', options: ['46', '23', '48', '44'], correctAnswer: '46', difficulty: 'medium' },
    { text: 'What is the hardest natural substance on Earth?', options: ['Diamond', 'Quartz', 'Graphite', 'Ruby'], correctAnswer: 'Diamond', difficulty: 'easy' },
  ],

  Mathematics: [
    { text: 'What is the value of Pi (π) to 2 decimal places?', options: ['3.14', '3.41', '3.12', '3.16'], correctAnswer: '3.14', difficulty: 'easy' },
    { text: 'What is the square root of 144?', options: ['12', '14', '11', '13'], correctAnswer: '12', difficulty: 'easy' },
    { text: 'What is 15% of 200?', options: ['30', '25', '35', '20'], correctAnswer: '30', difficulty: 'easy' },
    { text: 'What is the sum of angles in a triangle?', options: ['180°', '360°', '90°', '270°'], correctAnswer: '180°', difficulty: 'easy' },
    { text: 'What is 2 to the power of 10?', options: ['1024', '512', '2048', '256'], correctAnswer: '1024', difficulty: 'medium' },
    { text: 'What is the formula for the area of a circle?', options: ['πr²', '2πr', 'πd', 'r²'], correctAnswer: 'πr²', difficulty: 'medium' },
    { text: 'What is the derivative of x²?', options: ['2x', 'x', '2', 'x²'], correctAnswer: '2x', difficulty: 'medium' },
    { text: 'How many sides does a hexagon have?', options: ['6', '5', '7', '8'], correctAnswer: '6', difficulty: 'easy' },
    { text: 'What is the greatest common factor of 36 and 48?', options: ['12', '6', '18', '24'], correctAnswer: '12', difficulty: 'medium' },
    { text: 'What is the Pythagorean theorem?', options: ['a²+b²=c²', 'a+b=c', 'a²-b²=c²', 'ab=c²'], correctAnswer: 'a²+b²=c²', difficulty: 'easy' },
    { text: 'What is the prime factorization of 60?', options: ['2²×3×5', '2×3×5', '2³×5', '2²×3²'], correctAnswer: '2²×3×5', difficulty: 'hard' },
    { text: 'What is log₁₀(1000)?', options: ['3', '2', '4', '10'], correctAnswer: '3', difficulty: 'medium' },
    { text: 'What is the next prime number after 13?', options: ['17', '15', '16', '19'], correctAnswer: '17', difficulty: 'easy' },
    { text: 'What is the integral of 2x?', options: ['x²+C', '2x²+C', 'x+C', '2+C'], correctAnswer: 'x²+C', difficulty: 'hard' },
    { text: 'What is 0! (zero factorial)?', options: ['1', '0', 'undefined', 'infinity'], correctAnswer: '1', difficulty: 'medium' },
  ],

  History: [
    { text: 'In what year did World War II end?', options: ['1945', '1944', '1946', '1943'], correctAnswer: '1945', difficulty: 'easy' },
    { text: 'Who was the first President of the United States?', options: ['George Washington', 'Abraham Lincoln', 'Thomas Jefferson', 'John Adams'], correctAnswer: 'George Washington', difficulty: 'easy' },
    { text: 'Which empire was ruled by Julius Caesar?', options: ['Roman', 'Greek', 'Persian', 'Ottoman'], correctAnswer: 'Roman', difficulty: 'easy' },
    { text: 'In what year did the Berlin Wall fall?', options: ['1989', '1991', '1987', '1985'], correctAnswer: '1989', difficulty: 'medium' },
    { text: 'Who discovered America in 1492?', options: ['Christopher Columbus', 'Vasco da Gama', 'Amerigo Vespucci', 'John Cabot'], correctAnswer: 'Christopher Columbus', difficulty: 'easy' },
    { text: 'What was the name of the first artificial satellite?', options: ['Sputnik 1', 'Apollo 1', 'Explorer 1', 'Vostok 1'], correctAnswer: 'Sputnik 1', difficulty: 'medium' },
    { text: 'In which year did India gain independence?', options: ['1947', '1945', '1950', '1942'], correctAnswer: '1947', difficulty: 'easy' },
    { text: 'Who painted the Sistine Chapel ceiling?', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], correctAnswer: 'Michelangelo', difficulty: 'medium' },
    { text: 'What year did the Titanic sink?', options: ['1912', '1910', '1914', '1908'], correctAnswer: '1912', difficulty: 'easy' },
    { text: 'Which country was the first to give women the right to vote?', options: ['New Zealand', 'USA', 'UK', 'Australia'], correctAnswer: 'New Zealand', difficulty: 'hard' },
    { text: 'Who was the first man to walk on the moon?', options: ['Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'], correctAnswer: 'Neil Armstrong', difficulty: 'easy' },
    { text: 'The French Revolution began in which year?', options: ['1789', '1776', '1804', '1799'], correctAnswer: '1789', difficulty: 'medium' },
    { text: 'Who wrote the Magna Carta?', options: ['Barons forced King John to sign it', 'King Henry VIII', 'William Shakespeare', 'Oliver Cromwell'], correctAnswer: 'Barons forced King John to sign it', difficulty: 'hard' },
    { text: 'Which ancient wonder was located in Alexandria?', options: ['The Lighthouse', 'The Colossus', 'Hanging Gardens', 'The Sphinx'], correctAnswer: 'The Lighthouse', difficulty: 'medium' },
    { text: 'Who was known as the Iron Lady?', options: ['Margaret Thatcher', 'Indira Gandhi', 'Angela Merkel', 'Golda Meir'], correctAnswer: 'Margaret Thatcher', difficulty: 'easy' },
  ],

  Geography: [
    { text: 'What is the capital of Australia?', options: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane'], correctAnswer: 'Canberra', difficulty: 'medium' },
    { text: 'Which is the longest river in the world?', options: ['Nile', 'Amazon', 'Yangtze', 'Mississippi'], correctAnswer: 'Nile', difficulty: 'easy' },
    { text: 'What is the smallest country in the world?', options: ['Vatican City', 'Monaco', 'San Marino', 'Liechtenstein'], correctAnswer: 'Vatican City', difficulty: 'easy' },
    { text: 'Which continent is the Sahara Desert in?', options: ['Africa', 'Asia', 'Australia', 'South America'], correctAnswer: 'Africa', difficulty: 'easy' },
    { text: 'What is the tallest mountain in the world?', options: ['Mount Everest', 'K2', 'Kangchenjunga', 'Lhotse'], correctAnswer: 'Mount Everest', difficulty: 'easy' },
    { text: 'Which ocean is the largest?', options: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], correctAnswer: 'Pacific', difficulty: 'easy' },
    { text: 'What is the capital of Canada?', options: ['Ottawa', 'Toronto', 'Vancouver', 'Montreal'], correctAnswer: 'Ottawa', difficulty: 'medium' },
    { text: 'How many countries are in Africa?', options: ['54', '48', '52', '56'], correctAnswer: '54', difficulty: 'hard' },
    { text: 'Which country has the most natural lakes?', options: ['Canada', 'Russia', 'USA', 'Finland'], correctAnswer: 'Canada', difficulty: 'hard' },
    { text: 'What is the capital of Brazil?', options: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'], correctAnswer: 'Brasília', difficulty: 'medium' },
    { text: 'Which mountain range separates Europe from Asia?', options: ['Ural Mountains', 'Alps', 'Caucasus', 'Himalayas'], correctAnswer: 'Ural Mountains', difficulty: 'medium' },
    { text: 'What is the largest desert in the world?', options: ['Antarctic Desert', 'Sahara', 'Arabian', 'Gobi'], correctAnswer: 'Antarctic Desert', difficulty: 'hard' },
    { text: 'Which country has the longest coastline?', options: ['Canada', 'Russia', 'Norway', 'Australia'], correctAnswer: 'Canada', difficulty: 'hard' },
    { text: 'What is the capital of Japan?', options: ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima'], correctAnswer: 'Tokyo', difficulty: 'easy' },
    { text: 'Which river flows through Egypt?', options: ['Nile', 'Congo', 'Niger', 'Zambezi'], correctAnswer: 'Nile', difficulty: 'easy' },
  ],

  Technology: [
    { text: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correctAnswer: 'Central Processing Unit', difficulty: 'easy' },
    { text: 'Who founded Microsoft?', options: ['Bill Gates', 'Steve Jobs', 'Mark Zuckerberg', 'Elon Musk'], correctAnswer: 'Bill Gates', difficulty: 'easy' },
    { text: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High-Level Text Machine Language', 'HyperText Machine Language', 'HyperTransfer Markup Language'], correctAnswer: 'HyperText Markup Language', difficulty: 'easy' },
    { text: 'What is the binary representation of the number 10?', options: ['1010', '1100', '1001', '0110'], correctAnswer: '1010', difficulty: 'medium' },
    { text: 'Which programming language is known as the backbone of the web?', options: ['JavaScript', 'Python', 'Java', 'C++'], correctAnswer: 'JavaScript', difficulty: 'easy' },
    { text: 'What does HTTP stand for?', options: ['HyperText Transfer Protocol', 'High Transfer Text Protocol', 'HyperText Transmission Protocol', 'High Text Transfer Program'], correctAnswer: 'HyperText Transfer Protocol', difficulty: 'easy' },
    { text: 'What is the function of RAM in a computer?', options: ['Temporary data storage', 'Permanent data storage', 'Processing data', 'Displaying output'], correctAnswer: 'Temporary data storage', difficulty: 'easy' },
    { text: 'Who invented the World Wide Web?', options: ['Tim Berners-Lee', 'Bill Gates', 'Steve Jobs', 'Vint Cerf'], correctAnswer: 'Tim Berners-Lee', difficulty: 'medium' },
    { text: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Standard Question Language', 'Sequential Query Logic'], correctAnswer: 'Structured Query Language', difficulty: 'easy' },
    { text: 'What is the latest version of Bluetooth as of 2024?', options: ['5.4', '5.0', '4.2', '6.0'], correctAnswer: '5.4', difficulty: 'hard' },
    { text: 'What is an IP address?', options: ['A unique identifier for a device on a network', 'A type of programming language', 'A hardware component', 'A type of software'], correctAnswer: 'A unique identifier for a device on a network', difficulty: 'easy' },
    { text: 'Which company developed the Android OS?', options: ['Google', 'Apple', 'Microsoft', 'Samsung'], correctAnswer: 'Google', difficulty: 'easy' },
    { text: 'What is the time complexity of binary search?', options: ['O(log n)', 'O(n)', 'O(n²)', 'O(1)'], correctAnswer: 'O(log n)', difficulty: 'hard' },
    { text: 'What does API stand for?', options: ['Application Programming Interface', 'Automated Program Integration', 'Application Process Interface', 'Applied Programming Index'], correctAnswer: 'Application Programming Interface', difficulty: 'medium' },
    { text: 'What is open-source software?', options: ['Software with publicly available source code', 'Free software only', 'Software with no license', 'Software made by volunteers'], correctAnswer: 'Software with publicly available source code', difficulty: 'medium' },
  ],

  Literature: [
    { text: 'Who wrote "Romeo and Juliet"?', options: ['William Shakespeare', 'Charles Dickens', 'Jane Austen', 'Mark Twain'], correctAnswer: 'William Shakespeare', difficulty: 'easy' },
    { text: 'Which novel begins with "Call me Ishmael"?', options: ['Moby Dick', 'The Old Man and the Sea', 'Billy Budd', 'Lord Jim'], correctAnswer: 'Moby Dick', difficulty: 'medium' },
    { text: 'Who wrote "Pride and Prejudice"?', options: ['Jane Austen', 'Charlotte Brontë', 'Emily Brontë', 'George Eliot'], correctAnswer: 'Jane Austen', difficulty: 'easy' },
    { text: 'What is the name of the wizard school in Harry Potter?', options: ['Hogwarts', 'Beauxbatons', 'Durmstrang', 'Ilvermorny'], correctAnswer: 'Hogwarts', difficulty: 'easy' },
    { text: 'Who wrote "1984"?', options: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'H.G. Wells'], correctAnswer: 'George Orwell', difficulty: 'easy' },
    { text: 'In which Shakespeare play does the character Iago appear?', options: ['Othello', 'Hamlet', 'Macbeth', 'King Lear'], correctAnswer: 'Othello', difficulty: 'medium' },
    { text: 'Who wrote "The Great Gatsby"?', options: ['F. Scott Fitzgerald', 'Ernest Hemingway', 'John Steinbeck', 'William Faulkner'], correctAnswer: 'F. Scott Fitzgerald', difficulty: 'easy' },
    { text: 'What genre is "The Hitchhiker\'s Guide to the Galaxy"?', options: ['Comic sci-fi', 'Fantasy', 'Mystery', 'Horror'], correctAnswer: 'Comic sci-fi', difficulty: 'medium' },
    { text: 'Who wrote "Don Quixote"?', options: ['Miguel de Cervantes', 'Gabriel García Márquez', 'Pablo Neruda', 'Jorge Luis Borges'], correctAnswer: 'Miguel de Cervantes', difficulty: 'medium' },
    { text: 'What is the subtitle of "Frankenstein" by Mary Shelley?', options: ['The Modern Prometheus', 'The New Adam', 'The Lost Soul', 'The Dark Creation'], correctAnswer: 'The Modern Prometheus', difficulty: 'hard' },
    { text: 'Who wrote "The Odyssey"?', options: ['Homer', 'Virgil', 'Sophocles', 'Plato'], correctAnswer: 'Homer', difficulty: 'easy' },
    { text: 'What is the first book of the Bible?', options: ['Genesis', 'Exodus', 'Psalms', 'Matthew'], correctAnswer: 'Genesis', difficulty: 'easy' },
    { text: 'Who wrote "Crime and Punishment"?', options: ['Fyodor Dostoevsky', 'Leo Tolstoy', 'Anton Chekhov', 'Ivan Turgenev'], correctAnswer: 'Fyodor Dostoevsky', difficulty: 'medium' },
    { text: 'In "Lord of the Flies", who is the first leader of the boys?', options: ['Ralph', 'Jack', 'Piggy', 'Simon'], correctAnswer: 'Ralph', difficulty: 'medium' },
    { text: 'Who wrote "Brave New World"?', options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'Philip K. Dick'], correctAnswer: 'Aldous Huxley', difficulty: 'medium' },
  ],

  Sports: [
    { text: 'How many players are on a football (soccer) team?', options: ['11', '9', '10', '12'], correctAnswer: '11', difficulty: 'easy' },
    { text: 'How many Grand Slam tournaments are there in tennis?', options: ['4', '3', '5', '6'], correctAnswer: '4', difficulty: 'easy' },
    { text: 'In which sport would you perform a slam dunk?', options: ['Basketball', 'Volleyball', 'Handball', 'Water polo'], correctAnswer: 'Basketball', difficulty: 'easy' },
    { text: 'How many runs is a cricket six worth?', options: ['6', '4', '5', '3'], correctAnswer: '6', difficulty: 'easy' },
    { text: 'Which country has won the most FIFA World Cups?', options: ['Brazil', 'Germany', 'Italy', 'Argentina'], correctAnswer: 'Brazil', difficulty: 'medium' },
    { text: 'How many holes are in a standard round of golf?', options: ['18', '9', '12', '24'], correctAnswer: '18', difficulty: 'easy' },
    { text: 'What is the maximum score in a single bowling frame?', options: ['30', '10', '20', '15'], correctAnswer: '30', difficulty: 'hard' },
    { text: 'Who holds the record for most Olympic gold medals?', options: ['Michael Phelps', 'Usain Bolt', 'Carl Lewis', 'Mark Spitz'], correctAnswer: 'Michael Phelps', difficulty: 'medium' },
    { text: 'In boxing, how long is a standard round?', options: ['3 minutes', '2 minutes', '4 minutes', '5 minutes'], correctAnswer: '3 minutes', difficulty: 'medium' },
    { text: 'Which sport uses a shuttlecock?', options: ['Badminton', 'Tennis', 'Squash', 'Pickleball'], correctAnswer: 'Badminton', difficulty: 'easy' },
    { text: 'How many points is a touchdown worth in American football?', options: ['6', '7', '3', '2'], correctAnswer: '6', difficulty: 'medium' },
    { text: 'What is the diameter of a basketball hoop in inches?', options: ['18', '16', '20', '22'], correctAnswer: '18', difficulty: 'hard' },
    { text: 'Which country invented cricket?', options: ['England', 'Australia', 'India', 'West Indies'], correctAnswer: 'England', difficulty: 'medium' },
    { text: 'How many players are in a rugby union team?', options: ['15', '13', '11', '17'], correctAnswer: '15', difficulty: 'medium' },
    { text: 'What is the term for three consecutive strikes in bowling?', options: ['Turkey', 'Hat trick', 'Triple', 'Eagle'], correctAnswer: 'Turkey', difficulty: 'hard' },
  ],

  Music: [
    { text: 'How many strings does a standard guitar have?', options: ['6', '4', '5', '7'], correctAnswer: '6', difficulty: 'easy' },
    { text: 'Who is known as the King of Pop?', options: ['Michael Jackson', 'Elvis Presley', 'Prince', 'David Bowie'], correctAnswer: 'Michael Jackson', difficulty: 'easy' },
    { text: 'What does "forte" mean in music?', options: ['Loud', 'Soft', 'Fast', 'Slow'], correctAnswer: 'Loud', difficulty: 'medium' },
    { text: 'How many keys does a standard piano have?', options: ['88', '76', '72', '64'], correctAnswer: '88', difficulty: 'medium' },
    { text: 'Which band performed "Bohemian Rhapsody"?', options: ['Queen', 'The Beatles', 'Led Zeppelin', 'Pink Floyd'], correctAnswer: 'Queen', difficulty: 'easy' },
    { text: 'What is the highest female singing voice called?', options: ['Soprano', 'Alto', 'Mezzo-soprano', 'Contralto'], correctAnswer: 'Soprano', difficulty: 'medium' },
    { text: 'Who composed "Symphony No. 5 in C minor"?', options: ['Beethoven', 'Mozart', 'Bach', 'Chopin'], correctAnswer: 'Beethoven', difficulty: 'medium' },
    { text: 'What is the tempo marking "Allegro" in music?', options: ['Fast and lively', 'Slow', 'Moderate', 'Very slow'], correctAnswer: 'Fast and lively', difficulty: 'medium' },
    { text: 'How many notes are in a standard octave?', options: ['8', '7', '12', '6'], correctAnswer: '8', difficulty: 'easy' },
    { text: 'What instrument does a luthier make?', options: ['String instruments', 'Drums', 'Wind instruments', 'Keyboards'], correctAnswer: 'String instruments', difficulty: 'hard' },
    { text: 'Who sang "Thriller"?', options: ['Michael Jackson', 'Prince', 'James Brown', 'Stevie Wonder'], correctAnswer: 'Michael Jackson', difficulty: 'easy' },
    { text: 'What is a group of four musicians called?', options: ['Quartet', 'Trio', 'Quintet', 'Duet'], correctAnswer: 'Quartet', difficulty: 'easy' },
    { text: 'Which country is reggae music originally from?', options: ['Jamaica', 'Brazil', 'Cuba', 'Trinidad'], correctAnswer: 'Jamaica', difficulty: 'easy' },
    { text: 'What does "pianissimo" mean in music?', options: ['Very soft', 'Very loud', 'Very fast', 'Very slow'], correctAnswer: 'Very soft', difficulty: 'hard' },
    { text: 'Who composed "The Four Seasons"?', options: ['Vivaldi', 'Bach', 'Handel', 'Haydn'], correctAnswer: 'Vivaldi', difficulty: 'medium' },
  ],

  Movies: [
    { text: 'Who directed "Titanic" (1997)?', options: ['James Cameron', 'Steven Spielberg', 'Christopher Nolan', 'Peter Jackson'], correctAnswer: 'James Cameron', difficulty: 'easy' },
    { text: 'Which film won the first Academy Award for Best Picture?', options: ['Wings', 'Sunrise', 'The Jazz Singer', 'Ben-Hur'], correctAnswer: 'Wings', difficulty: 'hard' },
    { text: 'What is the highest-grossing film of all time?', options: ['Avatar', 'Avengers: Endgame', 'Titanic', 'Star Wars: The Force Awakens'], correctAnswer: 'Avatar', difficulty: 'medium' },
    { text: 'Who played Iron Man in the MCU?', options: ['Robert Downey Jr.', 'Chris Evans', 'Chris Hemsworth', 'Mark Ruffalo'], correctAnswer: 'Robert Downey Jr.', difficulty: 'easy' },
    { text: 'In "The Lion King", what is Simba\'s father\'s name?', options: ['Mufasa', 'Scar', 'Rafiki', 'Zazu'], correctAnswer: 'Mufasa', difficulty: 'easy' },
    { text: 'Which movie features the quote "I\'ll be back"?', options: ['The Terminator', 'Predator', 'Total Recall', 'RoboCop'], correctAnswer: 'The Terminator', difficulty: 'easy' },
    { text: 'Who directed "Schindler\'s List"?', options: ['Steven Spielberg', 'Stanley Kubrick', 'Martin Scorsese', 'Francis Ford Coppola'], correctAnswer: 'Steven Spielberg', difficulty: 'medium' },
    { text: 'What year was the first Star Wars film released?', options: ['1977', '1980', '1975', '1983'], correctAnswer: '1977', difficulty: 'medium' },
    { text: 'Which actor played Forrest Gump?', options: ['Tom Hanks', 'Tom Cruise', 'Robin Williams', 'Kevin Costner'], correctAnswer: 'Tom Hanks', difficulty: 'easy' },
    { text: 'What is the name of the toy cowboy in Toy Story?', options: ['Woody', 'Buzz', 'Rex', 'Hamm'], correctAnswer: 'Woody', difficulty: 'easy' },
    { text: 'Which film features the character "Hannibal Lecter"?', options: ['The Silence of the Lambs', 'Seven', 'Psycho', 'American Psycho'], correctAnswer: 'The Silence of the Lambs', difficulty: 'medium' },
    { text: 'Who composed the music for "Star Wars"?', options: ['John Williams', 'Hans Zimmer', 'Ennio Morricone', 'Danny Elfman'], correctAnswer: 'John Williams', difficulty: 'medium' },
    { text: 'In which film does a character say "You talking to me?"', options: ['Taxi Driver', 'Raging Bull', 'The Godfather', 'Goodfellas'], correctAnswer: 'Taxi Driver', difficulty: 'hard' },
    { text: 'What is the fictional African country in "Black Panther"?', options: ['Wakanda', 'Zamunda', 'Genovia', 'Sokovia'], correctAnswer: 'Wakanda', difficulty: 'easy' },
    { text: 'Who directed "The Dark Knight"?', options: ['Christopher Nolan', 'Tim Burton', 'Zack Snyder', 'Joel Schumacher'], correctAnswer: 'Christopher Nolan', difficulty: 'easy' },
  ],

  'General Knowledge': [
    { text: 'How many continents are there on Earth?', options: ['7', '6', '5', '8'], correctAnswer: '7', difficulty: 'easy' },
    { text: 'What is the largest organ in the human body?', options: ['Skin', 'Liver', 'Brain', 'Lungs'], correctAnswer: 'Skin', difficulty: 'easy' },
    { text: 'How many days are in a leap year?', options: ['366', '365', '364', '367'], correctAnswer: '366', difficulty: 'easy' },
    { text: 'What language has the most native speakers in the world?', options: ['Mandarin Chinese', 'Spanish', 'English', 'Hindi'], correctAnswer: 'Mandarin Chinese', difficulty: 'medium' },
    { text: 'What is the currency of Japan?', options: ['Yen', 'Yuan', 'Won', 'Baht'], correctAnswer: 'Yen', difficulty: 'easy' },
    { text: 'How many sides does a pentagon have?', options: ['5', '6', '7', '4'], correctAnswer: '5', difficulty: 'easy' },
    { text: 'What is the chemical symbol for gold?', options: ['Au', 'Ag', 'Gd', 'Go'], correctAnswer: 'Au', difficulty: 'medium' },
    { text: 'Which planet is closest to the sun?', options: ['Mercury', 'Venus', 'Earth', 'Mars'], correctAnswer: 'Mercury', difficulty: 'easy' },
    { text: 'How many colors are in a rainbow?', options: ['7', '6', '8', '5'], correctAnswer: '7', difficulty: 'easy' },
    { text: 'What is the boiling point of water in Celsius?', options: ['100°C', '90°C', '110°C', '120°C'], correctAnswer: '100°C', difficulty: 'easy' },
    { text: 'Which animal is the fastest on land?', options: ['Cheetah', 'Lion', 'Horse', 'Greyhound'], correctAnswer: 'Cheetah', difficulty: 'easy' },
    { text: 'What is the most spoken language in the world by total speakers?', options: ['English', 'Mandarin', 'Spanish', 'Hindi'], correctAnswer: 'English', difficulty: 'medium' },
    { text: 'How many planets are in our solar system?', options: ['8', '9', '7', '10'], correctAnswer: '8', difficulty: 'easy' },
    { text: 'What is the square root of 256?', options: ['16', '14', '18', '12'], correctAnswer: '16', difficulty: 'medium' },
    { text: 'Who invented the telephone?', options: ['Alexander Graham Bell', 'Thomas Edison', 'Nikola Tesla', 'Guglielmo Marconi'], correctAnswer: 'Alexander Graham Bell', difficulty: 'easy' },
  ],
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Clear old questions
    await Question.deleteMany({});
    console.log('Old questions cleared');

    // Fetch all categories from DB
    const categories = await Category.find({});
    if (categories.length === 0) {
      console.error('No categories found. Run categorySeeder.js first!');
      process.exit(1);
    }

    // Build a name → _id map
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat.name] = cat._id;
    });

    // Build questions array with correct category ObjectId
    const allQuestions = [];
    for (const [categoryName, questions] of Object.entries(questionsByCategory)) {
      const categoryId = categoryMap[categoryName];
      if (!categoryId) {
        console.warn(`Category "${categoryName}" not found in DB, skipping...`);
        continue;
      }
      questions.forEach((q) => {
        allQuestions.push({ ...q, category: categoryId });
      });
    }

    const inserted = await Question.insertMany(allQuestions);
    console.log(`✅ ${inserted.length} questions inserted across ${Object.keys(questionsByCategory).length} categories`);

    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err.message);
    process.exit(1);
  }
};

seed();