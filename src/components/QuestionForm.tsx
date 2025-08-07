'use client'

import { useState } from 'react'

interface QuestionFormProps {
  onSubmit: (questionData: {
    question: string
    type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
    term: 'START' | 'END'
    options?: string[]
    order?: number
  }) => void
  onCancel: () => void
  initialData?: {
    question: string
    type: 'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'
    term: 'START' | 'END'
    options?: string[]
    order?: number
  }
  activeTerm: 'START' | 'END'
  loading?: boolean
}

export default function QuestionForm({ 
  onSubmit, 
  onCancel, 
  initialData, 
  activeTerm,
  loading = false 
}: QuestionFormProps) {
  const [question, setQuestion] = useState(initialData?.question || '')
  const [type, setType] = useState<'TEXT' | 'TEXTAREA' | 'MCQ' | 'CHECKBOX'>(
    initialData?.type || 'TEXT'
  )
  const [term, setTerm] = useState<'START' | 'END'>(initialData?.term || activeTerm)
  const [options, setOptions] = useState<string[]>(initialData?.options || [''])
  const [order, setOrder] = useState(initialData?.order || 0)

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const filteredOptions = options.filter(opt => opt.trim() !== '')
    
    if ((type === 'MCQ' || type === 'CHECKBOX') && filteredOptions.length < 2) {
      alert('MCQ and Checkbox questions must have at least 2 options')
      return
    }

    onSubmit({
      question: question.trim(),
      type,
      term,
      options: (type === 'MCQ' || type === 'CHECKBOX') ? filteredOptions : undefined,
      order
    })
  }

  const isEditing = !!initialData

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Question' : 'Create New Question'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700">
            Question Text
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter your question here..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Question Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="TEXT">Single Line Text</option>
              <option value="TEXTAREA">Multi Line Text</option>
              <option value="MCQ">Multiple Choice (Single)</option>
              <option value="CHECKBOX">Multiple Choice (Multiple)</option>
            </select>
          </div>

          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700">
              Term
            </label>
            <select
              id="term"
              value={term}
              onChange={(e) => setTerm(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              disabled={isEditing}
            >
              <option value="START">Start of Year</option>
              <option value="END">End of Year</option>
            </select>
            {term !== activeTerm && (
              <p className="mt-1 text-xs text-yellow-600">
                Warning: This term is not currently active
              </p>
            )}
          </div>

          <div>
            <label htmlFor="order" className="block text-sm font-medium text-gray-700">
              Order
            </label>
            <input
              type="number"
              id="order"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              min="0"
            />
          </div>
        </div>

        {(type === 'MCQ' || type === 'CHECKBOX') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="px-3 py-2 text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                + Add Option
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Question' : 'Create Question')}
          </button>
        </div>
      </form>
    </div>
  )
}