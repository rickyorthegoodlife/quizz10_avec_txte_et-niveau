import React, { useState } from 'react'

    function App() {
      const [questions, setQuestions] = useState([])
      const [loading, setLoading] = useState(false)
      const [error, setError] = useState(null)
      const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
      const [userAnswers, setUserAnswers] = useState([])
      const [showResults, setShowResults] = useState(false)

      const generateQuestions = async (formData) => {
        setLoading(true)
        setError(null)
        try {
          const prompt = formData.useText
            ? `À partir du texte suivant : "${formData.text}", génère ${formData.numberOfQuestions} questions à choix multiples pour un niveau ${formData.studyLevel} avec une difficulté ${formData.difficulty}. Inclus les réponses correctes. Formatte la réponse en JSON valide avec un tableau de questions, chaque question ayant les propriétés suivantes : question (string), options (un tableau de 4 strings), et correctAnswer (l'index de la bonne réponse, number). Retourne uniquement le JSON, sans texte supplémentaire.`
            : `Génère ${formData.numberOfQuestions} questions à choix multiples sur le sujet "${formData.topic}" pour un niveau ${formData.studyLevel} avec une difficulté ${formData.difficulty}. Inclus les réponses correctes. Formatte la réponse en JSON valide avec un tableau de questions, chaque question ayant les propriétés suivantes : question (string), options (un tableau de 4 strings), et correctAnswer (l'index de la bonne réponse, number). Retourne uniquement le JSON, sans texte supplémentaire.`

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${formData.apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'user',
                  content: prompt
                }
              ],
              max_tokens: 1000,
              temperature: 0.7
            })
          })
          const data = await response.json()
          if (data.choices && data.choices[0].message) {
            const content = data.choices[0].message.content
            const jsonMatch = content.match(/\[.*\]/s)
            if (jsonMatch) {
              try {
                const parsedQuestions = JSON.parse(jsonMatch[0])
                if (Array.isArray(parsedQuestions) && parsedQuestions.every(q => 
                  q.question && typeof q.question === 'string' &&
                  Array.isArray(q.options) && q.options.length === 4 &&
                  q.options.every(opt => typeof opt === 'string') &&
                  typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
                )) {
                  setQuestions(parsedQuestions)
                  setCurrentQuestionIndex(0)
                  setUserAnswers(new Array(parsedQuestions.length).fill(null))
                  setShowResults(false)
                } else {
                  setError('Le format des questions est incorrect')
                }
              } catch (err) {
                setError('Erreur lors du parsing des questions')
              }
            } else {
              setError('Aucun JSON valide trouvé dans la réponse')
            }
          }
        } catch (err) {
          setError('Erreur lors de la génération des questions')
        } finally {
          setLoading(false)
        }
      }

      const handleAnswer = (index) => {
        const newAnswers = [...userAnswers]
        newAnswers[currentQuestionIndex] = index
        setUserAnswers(newAnswers)
      }

      const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1)
        }
      }

      const handleSubmit = () => {
        setShowResults(true)
      }

      return (
        <div className="min-h-screen bg-gray-100 p-8">
          <h1 className="text-3xl font-bold mb-8">Générateur de Questions</h1>
          {questions.length === 0 ? (
            <QuestionForm onSubmit={generateQuestions} loading={loading} />
          ) : showResults ? (
            <Results 
              questions={questions}
              userAnswers={userAnswers}
              onRestart={() => {
                setQuestions([])
                setUserAnswers([])
                setShowResults(false)
              }}
            />
          ) : (
            <Quiz
              question={questions[currentQuestionIndex]}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={userAnswers[currentQuestionIndex]}
              onAnswer={handleAnswer}
              onNext={handleNext}
              onSubmit={handleSubmit}
            />
          )}
          {error && <p className="text-red-500">{error}</p>}
        </div>
      )
    }

    function QuestionForm({ onSubmit, loading }) {
      const [formData, setFormData] = useState({
        useText: false,
        topic: '',
        text: '',
        difficulty: 'facile',
        studyLevel: 'sixième',
        specialty: '',
        numberOfQuestions: 5,
        apiKey: ''
      })

      const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.useText && !formData.topic) {
          alert('Veuillez entrer un sujet ou un texte')
          return
        }
        onSubmit(formData)
      }

      return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2">Utiliser un texte ?</label>
              <select
                value={formData.useText}
                onChange={(e) => setFormData({ ...formData, useText: e.target.value === 'true' })}
                className="w-full p-2 border rounded"
              >
                <option value={false}>Non</option>
                <option value={true}>Oui</option>
              </select>
            </div>
            {formData.useText ? (
              <div>
                <label className="block mb-2">Texte</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows="4"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block mb-2">Sujet</label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            )}
            <div>
              <label className="block mb-2">Difficulté</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
            <div>
              <label className="block mb-2">Niveau d'étude</label>
              <select
                value={formData.studyLevel}
                onChange={(e) => setFormData({ ...formData, studyLevel: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="sixième">Sixième</option>
                <option value="cinquième">Cinquième</option>
                <option value="quatrième">Quatrième</option>
                <option value="troisième">Troisième</option>
                <option value="seconde">Seconde</option>
                <option value="première">Première</option>
                <option value="terminale">Terminale</option>
                <option value="licence1">Licence 1</option>
                <option value="licence2">Licence 2</option>
                <option value="licence3">Licence 3</option>
                <option value="master1">Master 1</option>
                <option value="master2">Master 2</option>
              </select>
            </div>
            {['licence1', 'licence2', 'licence3', 'master1', 'master2'].includes(formData.studyLevel) && (
              <div>
                <label className="block mb-2">Spécialité</label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
            )}
            <div>
              <label className="block mb-2">Nombre de questions</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.numberOfQuestions}
                onChange={(e) => setFormData({ ...formData, numberOfQuestions: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2">Clé API OpenAI</label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Génération en cours...' : 'Générer des questions'}
          </button>
        </form>
      )
    }

    function Quiz({ question, questionNumber, totalQuestions, selectedAnswer, onAnswer, onNext, onSubmit }) {
      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Question {questionNumber} sur {totalQuestions}</h2>
          <h3 className="font-semibold mb-2">{question.question}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {question.options.map((option, i) => (
              <div key={i} className="flex items-center">
                <input
                  type="radio"
                  name="question"
                  id={`option-${i}`}
                  className="mr-2"
                  checked={selectedAnswer === i}
                  onChange={() => onAnswer(i)}
                />
                <label htmlFor={`option-${i}`}>{option}</label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            {questionNumber < totalQuestions ? (
              <button
                onClick={onNext}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={onSubmit}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Soumettre
              </button>
            )}
          </div>
        </div>
      )
    }

    function Results({ questions, userAnswers, onRestart }) {
      const score = userAnswers.reduce((total, answer, index) => {
        return answer === questions[index].correctAnswer ? total + 1 : total
      }, 0)

      return (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Résultats</h2>
          <p className="mb-4">Vous avez obtenu {score} bonnes réponses sur {questions.length}.</p>
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="border-b pb-4">
                <h3 className="font-semibold mb-2">{question.question}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {question.options.map((option, i) => (
                    <div key={i} className={`flex items-center p-2 rounded ${
                      i === question.correctAnswer ? 'bg-green-100' :
                      i === userAnswers[index] ? 'bg-red-100' : ''
                    }`}>
                      <input
                        type="radio"
                        name={`result-${index}`}
                        id={`result-${index}-option-${i}`}
                        className="mr-2"
                        checked={i === userAnswers[index]}
                        disabled
                      />
                      <label htmlFor={`result-${index}-option-${i}`}>{option}</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onRestart}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Recommencer
          </button>
        </div>
      )
    }

    export default App
