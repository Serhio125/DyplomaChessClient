import { useNavigate, useRouteError } from "react-router-dom";
import { Button, TextField } from "@mui/material";

export const ErrorPage = () => {
  //const error = useRouteError() as any;
  const test = useNavigate();
  //console.error(error);
  return (
    <div id="error-page">
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occurred.</p>
      <TextField label={"hello"} />
      <Button
        value={"example"}
        onClick={() => {
          setTimeout(() => {
            test("/");
          }, 1000);
        }}
      />
    </div>
  );
};
