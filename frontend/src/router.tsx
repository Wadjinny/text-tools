import { createBrowserRouter } from 'react-router'
import RootLayout from './routes/root'
import HomePage from './routes/home'
import EditorPage from './routes/editor'
import ErrorPage from './routes/error-page'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'pipeline/:pipelineId', element: <EditorPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
