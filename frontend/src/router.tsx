import { createBrowserRouter } from 'react-router'
import RootLayout from './routes/root'
import HomePage from './routes/home'
import EditorPage from './routes/editor'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'pipeline/:pipelineId', element: <EditorPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
)
