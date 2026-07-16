import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import './index.css'
import { router } from './router.tsx'
import { PipelinesProvider } from './context/PipelinesContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PipelinesProvider>
      <RouterProvider router={router} />
    </PipelinesProvider>
  </StrictMode>,
)
