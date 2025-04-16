import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SnackbarProvider } from "notistack";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Root } from "./routes/root";
import "./index.css";
import { ErrorPage } from "./error-page";
import GlobalContext from "./contexts/globalContext";
import { TypeGlobalContext } from "./contexts/typeGlobalContext";
import { ActiveParty } from "./routes/activeParty";
import { AnalysesParty } from "./routes/analysesParty";
import { ActiveReport } from "./routes/ActiveReport";
import { ResolveReport } from "./routes/ResolveReport";
import { GameInvite } from "./routes/GameInvite";
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/contacts/:id",
        element: (
          <div>
            <h1>Hello world!!!!</h1>
          </div>
        ),
      },
    ],
  },
  {
    path: "/activeParty/:uuid",
    errorElement: <ErrorPage />,
    element: <ActiveParty />,
  },
  {
    path: "/analysesParty/:uuid",
    errorElement: <ErrorPage />,
    element: <AnalysesParty />,
  },
  {
    path: "/activeReport/:uuid",
    errorElement: <ErrorPage />,
    element: <ActiveReport />,
  },
  {
    path: "/resolvedReport/:uuid",
    errorElement: <ErrorPage />,
    element: <ResolveReport />,
  },
  {
    path: "/gameInvite/:uuid",
    errorElement: <ErrorPage />,
    element: <GameInvite />, //TODO
  },
  {
    path: "/analysesParty/",
    errorElement: <ErrorPage />,
    element: <AnalysesParty />,
  },
]);
const contextValue: TypeGlobalContext = {
  sessionToken: null,
  sessionCredentials: null,
};

root.render(
  <GlobalContext.Provider value={contextValue}>
    <SnackbarProvider
      maxSnack={5}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
    >
      <RouterProvider router={router} />
    </SnackbarProvider>
  </GlobalContext.Provider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
