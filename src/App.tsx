import {
  Link,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { Certificate } from '@/components/Certificate'
import { Landing } from '@/components/Landing'
import { ModulePlayer } from '@/components/ModulePlayer'
import { buttonVariants } from '@/components/ui/button'
import { loadProgress, saveProgress } from '@/lib/progress'
import { modules } from '@/modules'

function findModule(id: string) {
  const mod = modules.find((m) => m.id === id)
  if (!mod) throw redirect({ to: '/modules' })
  return mod
}

const rootRoute = createRootRoute()

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Landing,
})

const modulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'modules',
  component: Modules,
})

const moduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'modules/$moduleId',
  loader: ({ params }) => findModule(params.moduleId),
  component: Play,
})

const certRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'modules/$moduleId/certificate',
  loader: ({ params }) => {
    const mod = findModule(params.moduleId)
    if (!loadProgress()[mod.id]) throw redirect({ to: '/modules/$moduleId', params })
    return mod
  },
  component: Cert,
})

const router = createRouter({
  routeTree: rootRoute.addChildren([landingRoute, modulesRoute, moduleRoute, certRoute]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function Modules() {
  const progress = loadProgress()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-semibold">Modules</h1>
      <ul className="flex flex-col gap-3">
        {modules.map((mod) => (
          <li
            key={mod.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <h2 className="font-medium">{mod.title}</h2>
              <p className="text-sm text-muted-foreground">
                {progress[mod.id] ? 'Completed' : mod.brief}
              </p>
            </div>
            <div className="flex gap-2">
              {progress[mod.id] && (
                <Link
                  to="/modules/$moduleId/certificate"
                  params={{ moduleId: mod.id }}
                  className={buttonVariants({ variant: 'outline' })}
                >
                  View certificate
                </Link>
              )}
              <Link
                to="/modules/$moduleId"
                params={{ moduleId: mod.id }}
                className={buttonVariants()}
              >
                {progress[mod.id] ? 'Play again' : 'Start'}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

function Play() {
  const mod = moduleRoute.useLoaderData()
  const navigate = moduleRoute.useNavigate()

  return (
    <ModulePlayer
      key={mod.id}
      mod={mod}
      onExit={() => navigate({ to: '/modules' })}
      onComplete={(name) => {
        saveProgress({
          ...loadProgress(),
          [mod.id]: {
            name,
            date: new Date().toISOString(),
            certId: crypto.randomUUID().slice(0, 8).toUpperCase(),
          },
        })
        navigate({ to: '/modules/$moduleId/certificate', params: { moduleId: mod.id } })
      }}
    />
  )
}

function Cert() {
  const mod = certRoute.useLoaderData()
  const navigate = certRoute.useNavigate()

  return (
    <Certificate
      title={mod.title}
      cert={loadProgress()[mod.id]}
      onBack={() => navigate({ to: '/modules' })}
    />
  )
}

function App() {
  return <RouterProvider router={router} />
}

export default App
