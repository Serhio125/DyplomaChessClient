import { Link, Outlet, useNavigate } from "react-router-dom";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import GlobalContext from "../contexts/globalContext";
import { TypeGlobalContext } from "../contexts/typeGlobalContext";
import { RegistrationPayloadModel } from "../models/registration-payload.model";
import { io } from "socket.io-client";
import { ActiveGameModel } from "../models/active-game.model";
import { ActivePartyModel } from "../models/active-party.model";
import { UserModel } from "../models/user.model";
import { MoveModel } from "../models/move.model";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Chessboard } from "react-chessboard";
import Cookies from "js-cookie";
import { ActiveReportModel } from "../models/active-report.model";
import { ResolveReportModel } from "../models/resolve-report.model";
import { useSnackbar } from "notistack";
import { CheckIcon, ClipboardCopyIcon } from "lucide-react";
import { Clipboard } from "@ark-ui/react";
const Basic = ({ value }: { value: string }) => {
  return (
    <Clipboard.Root value={value} timeout={2000}>
      <Clipboard.Label>Ссылка</Clipboard.Label>
      <Clipboard.Control>
        <Clipboard.Input style={{ marginRight: "15px" }} />
        <Clipboard.Trigger>
          <Clipboard.Indicator copied={<CheckIcon />}>
            <ClipboardCopyIcon />
          </Clipboard.Indicator>
        </Clipboard.Trigger>
      </Clipboard.Control>
    </Clipboard.Root>
  );
};
export const Root = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [searchGame, setSearchGame] = useState<boolean>(false);
  const [render, setRender] = useState<boolean>(true);
  const contextValue = useContext(GlobalContext) as TypeGlobalContext;
  const [password, setPassword] = useState<string>("");
  const [login, setLogin] = useState<string>("");
  const [passwordReg, setPasswordReg] = useState<string>("");
  const [loginReg, setLoginReg] = useState<string>("");
  const [firstNameReg, setFirstNameReg] = useState<string>("");
  const [lastNameReg, setLastNameReg] = useState<string>("");
  const [countryReg, setCountryReg] = useState<string>("");
  const [authDialog, setAuthDialog] = useState<boolean>(false);
  const [regDialog, setRegDialog] = useState<boolean>(false);
  const [activeGames, setActiveGames] = useState<{
    activeGames: ActiveGameModel[];
    activeParties: ActivePartyModel[];
    opponents: UserModel[];
    partyMoves: MoveModel[][];
  }>({
    activeGames: [],
    activeParties: [],
    opponents: [],
    partyMoves: [],
  });
  const [activeReports, setActiveReports] = useState<{
    reports: ActiveReportModel[];
    users: {
      userSrc: string;
      userDst: string;
    }[];
  }>({
    reports: [],
    users: [],
  });
  const [resolveReports, setResolveReports] = useState<{
    reports: ActiveReportModel[];
    users: {
      userSrc: string;
      userDst: string;
      admin: string;
    }[];
  }>({
    reports: [],
    users: [],
  });
  const [isActiveReportsSlider, setIsActiveReportsSlider] =
    useState<boolean>(false);
  const [isResolvedReportsSlider, setIsResolvedReportsSlider] =
    useState<boolean>(false);
  const [isActiveGamesSlider, setIsActiveGamesSlider] =
    useState<boolean>(false);
  const [finishedGames, setFinishedGames] = useState<{
    activeGames: ActiveGameModel[];
    activeParties: ActivePartyModel[];
    opponents: UserModel[];
    partyMoves: MoveModel[][];
  }>({
    activeGames: [],
    activeParties: [],
    opponents: [],
    partyMoves: [],
  });
  const [isFinishedGamesSlider, setIsFinishedGamesSlider] =
    useState<boolean>(false);
  const [inviteUuid, setInviteUuid] = useState<string>("");
  const navigation = useNavigate();
  const socket = useRef(
    io("ws://localhost:3005", {
      // auth: {
      //   token: contextValue.sessionToken,
      // },
      // query: {
      //   hello: "world",
      //   test: true,
      // },
      // reconnection: false,
      autoConnect: false,
    }),
  );
  const socketConnect = () => {
    socket.current = io("ws://localhost:3005", {
      auth: {
        token: contextValue.sessionToken,
      },
      query: {
        event: "search",
        login: contextValue.sessionCredentials?.login,
        uuid: contextValue.sessionCredentials?.uuid,
      },
      reconnection: false,
      autoConnect: false,
    });
    socket.current.connect();
    socket.current.on("connect", () => {
      console.log("Socket connection success?");
      setSearchGame(true);
    });
    socket.current.on("connect_error", (err) => {
      console.error("Error when attempt to connect to server socket:");
      console.log(err);
      setSearchGame(false);
    });
    socket.current.on("disconnect", (reason, description) => {
      console.log("Socket dsiconnected:");
      console.log(reason);
      setSearchGame(false);
    });
    socket.current.on("startNewGame", (args) => {
      console.log("Server event startNewGame:");
      console.log(args);
      setSearchGame(false);
      navigation("/activeParty/" + args.activeGameUuid, {
        replace: true,
      });
    });
    socket.current.on("inviteRef", (args) => {
      console.log("Server event invite:");
      console.log(args);
      setInviteUuid(args.inviteUuid);
    });
    socket.current.on("Error", (args) => {
      console.log("Server send error:");
      console.log(args);
    });
    socket.current.on("serverError", (args) => {
      console.log("Server send serverError:");
      console.log(args);
    });
    socket.current.on("clientError", (args) => {
      console.log("Server send clientError:");
      console.log(args);
    });
  };
  const socketEmitHandle = () => {
    if (socket.current.connected) {
      socket.current.emit("test", {
        hello: "world",
        test: true,
      });
    }
  };
  const socketDisconnect = () => {
    if (socket.current.connected) {
      socket.current.disconnect();
    }
  };
  const handleClick = () => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    // @ts-ignore
    const base64 = btoa(String.fromCharCode.apply(null, data));
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/auth", {
        password: base64
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, ""),
        login: login,
      })
      .then((value) => {
        console.log(value);
        enqueueSnackbar("Авторизация успешна", {
          variant: "success",
          autoHideDuration: 3000,
        });
        contextValue.sessionToken = value.data.sessionToken;
        contextValue.sessionCredentials = {
          ...value.data.userData,
        };
        setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        console.error(reason);
        enqueueSnackbar(
          `Ошибка авторизации${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 5000,
          },
        );
      });
  };
  const getActiveGames = () => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/getActiveGames", {
        userUuid: contextValue.sessionCredentials?.uuid,
        token: contextValue.sessionToken,
      })
      .then((value) => {
        console.log(value);
        enqueueSnackbar("Активные партии успешно загружены", {
          variant: "success",
          autoHideDuration: 3000,
        });
        setActiveGames(value.data);
        setIsActiveGamesSlider(true);
        //setIsFinishedGamesSlider(false);
        //setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        console.error(reason);
        enqueueSnackbar(
          `Ошибка загрузки активных партий${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 3000,
          },
        );
      });
  };
  const getFinishedGames = () => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/getFinishedGames", {
        userUuid: contextValue.sessionCredentials?.uuid,
        token: contextValue.sessionToken,
      })
      .then((value) => {
        console.log(value);
        enqueueSnackbar("Завершённые партии успешно загружены", {
          variant: "success",
          autoHideDuration: 3000,
        });
        setFinishedGames(value.data);
        //setIsActiveGamesSlider(false);
        setIsFinishedGamesSlider(true);
        //setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        enqueueSnackbar(
          `Ошибка загрузки завершённых партий${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 5000,
          },
        );
        console.error(reason);
      });
  };
  const getActiveReports = () => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/getActiveReports", {
        userUuid: contextValue.sessionCredentials?.uuid,
        token: contextValue.sessionToken,
      })
      .then((value) => {
        enqueueSnackbar("Активные жалобы успешно загружены", {
          variant: "success",
          autoHideDuration: 3000,
        });
        console.log(value);
        setActiveReports(value.data);
        setIsActiveReportsSlider(true);
        //setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        enqueueSnackbar(
          `Ошибка загрузки активных жалоб${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 3000,
          },
        );
        console.error(reason);
      });
  };
  const getResolvedReports = () => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/getResolvedReports", {
        userUuid: contextValue.sessionCredentials?.uuid,
        token: contextValue.sessionToken,
      })
      .then((value) => {
        enqueueSnackbar("Рассмотренные жалобы успешно загружены", {
          variant: "success",
          autoHideDuration: 3000,
        });
        console.log(value);
        setResolveReports(value.data);
        setIsResolvedReportsSlider(true);
        //setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        enqueueSnackbar(
          `Ошибка загрузки рассмотренных жалоб${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "error",
            autoHideDuration: 3000,
          },
        );
        console.error(reason);
      });
  };
  const handleRegistr = () => {
    const payload: RegistrationPayloadModel = {
      firstName: firstNameReg,
      country: countryReg,
      login: loginReg,
      password: passwordReg,
      lastName: lastNameReg,
    };
    console.log(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payload.password);
    // @ts-ignore
    const base64 = btoa(String.fromCharCode.apply(null, data));
    payload.password = base64
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/registr", {
        ...payload,
      })
      .then((value) => {
        enqueueSnackbar("Регистрация успешна", {
          variant: "success",
          autoHideDuration: 3000,
        });
        console.log(value);
      })
      .catch((reason) => {
        enqueueSnackbar(
          `Ошибка регистрации${typeof reason.response?.data === "string" && (reason.response.data as string).length ? `: ${reason.response.data as string}` : ""}`,
          {
            variant: "success",
            autoHideDuration: 5000,
          },
        );
        console.error(reason);
      });
  };
  const handleClickwoData = () => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/auth")
      .then((value) => {
        console.log(value);
      })
      .catch((reason) => {
        console.error(reason);
      });
  };
  const accountExitClick = () => {
    console.log("Account exit clicked, current cookies:");
    Cookies.remove("authToken");
    console.log(Cookies.get());
    contextValue.sessionToken = null;
    contextValue.sessionCredentials = null;
    if (socket.current.connected) {
      socket.current.disconnect();
    }
    setIsFinishedGamesSlider(false);
    setIsActiveGamesSlider(false);
    setLastNameReg("");
    setActiveGames({
      activeGames: [],
      activeParties: [],
      opponents: [],
      partyMoves: [],
    });
    setFinishedGames({
      activeGames: [],
      activeParties: [],
      opponents: [],
      partyMoves: [],
    });
    setSearchGame(false);
  };
  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios
      .post("http://localhost:8080/auth")
      .then((value) => {
        console.log(value);
        contextValue.sessionToken = value.data.sessionToken;
        contextValue.sessionCredentials = {
          ...value.data.userData,
        };
        setRender((prevState) => !prevState);
      })
      .catch((reason) => {
        console.error(reason);
      });
    return () => {
      console.log("Root component destroyed");
    };
  }, []);
  let settings = {
    dots: true,
    //infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
  };
  return contextValue.sessionCredentials ? (
    contextValue.sessionCredentials.role === "Admin" ? (
      <div style={{ display: "grid", width: "100%" }}>
        <div>
          <h2>{`Логин: ${contextValue.sessionCredentials.login}`}</h2>
          <h2>{`Роль: Администратор`}</h2>
          {/*<h2>{`Country: ${contextValue.sessionCredentials.country}`}</h2>*/}
          <Button
            sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
            onClick={accountExitClick} //TODO обновить accountExitClick с занулением админской инфы
          >
            Выйти из учётной записи
          </Button>
        </div>
        <div
          id="sidebar"
          style={{ position: "absolute", left: "40%", top: "15%" }}
        >
          <nav>
            <ul>
              <li style={{ paddingTop: "15px" }}>
                <Button
                  sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
                  onClick={() => {
                    getActiveReports();
                  }}
                >
                  Просмотреть активные жалобы
                </Button>
              </li>
              <li style={{ paddingTop: "15px" }}>
                <Button
                  sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
                  onClick={() => {
                    getResolvedReports();
                  }}
                >
                  Просмотреть рассмотренные жалобы
                </Button>
              </li>
            </ul>
          </nav>
        </div>
        {isActiveReportsSlider ? (
          <div
            style={{
              width: "370px",
              height: "370px",
              position: "absolute",
              left: "8%",
              top: "25%",
            }}
          >
            <h2>Активные жалобы</h2>
            <Slider {...settings}>
              {activeReports.reports.map((value, index) => {
                //console.log("Report on slider render");
                return (
                  <div
                    style={{
                      width: "100px",
                      height: "200px",
                      display: "grid",
                      overflow: "auto",
                    }}
                  >
                    <h3 style={{ color: "green" }}>
                      {"Жалобу подал пользователь: " +
                        activeReports.users[index].userSrc}
                    </h3>
                    <h3 style={{ color: "red" }}>
                      {"Жалоба подана на пользователя: " +
                        activeReports.users[index].userDst}
                    </h3>
                    <TextField
                      sx={{ paddingTop: "10px", paddingBottom: "10px" }}
                      disabled={true}
                      fullWidth={true}
                      label={"Причина жалобы:"}
                      multiline={true}
                      size={"small"}
                      value={activeReports.reports[index].describe}
                    />
                    <Button
                      sx={{
                        left: "30%",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                      onClick={() => {
                        // console.log(
                        //   `Active party with uuid = ${activeGames.activeParties[index].uuid} picked`,
                        // );
                        navigation(`/activeReport/${value.uuid}`, {
                          replace: true,
                        });
                      }}
                    >
                      Рассмотреть жалобу
                    </Button>
                    <div style={{ paddingTop: "10px" }}></div>
                  </div>
                );
              })}
            </Slider>
          </div>
        ) : null}
        {isResolvedReportsSlider ? (
          <div
            style={{
              width: "370px",
              height: "370px",
              position: "absolute",
              left: "70%",
              top: "25%",
            }}
          >
            <h2>Рассмотренные жалобы</h2>
            <Slider {...settings}>
              {resolveReports.reports.map((value, index) => {
                //console.log("Report on slider render");
                return (
                  <div
                    style={{
                      width: "100px",
                      height: "200px",
                      display: "grid",
                      overflow: "auto",
                    }}
                  >
                    <h3 style={{ color: "green" }}>
                      {"Жалобу подал пользователь: " +
                        resolveReports.users[index].userSrc}
                    </h3>
                    <h3 style={{ color: "red" }}>
                      {"Жалоба подана на пользователя: " +
                        resolveReports.users[index].userDst}
                    </h3>
                    <TextField
                      sx={{ paddingTop: "10px", paddingBottom: "10px" }}
                      disabled={true}
                      fullWidth={true}
                      label={"Причина жалобы:"}
                      multiline={true}
                      size={"small"}
                      value={resolveReports.reports[index].describe}
                    />
                    <h3 style={{ color: "yellow" }}>
                      {"Администратор: " + resolveReports.users[index].admin}
                    </h3>
                    <h3
                      style={{ color: value.status === "B" ? "red" : "green" }}
                    >
                      {"Решение: " +
                        (value.status === "B"
                          ? "Пользователь забанен"
                          : "Недостаточно оснований")}
                    </h3>
                    <Button
                      sx={{
                        left: "30%",
                        paddingTop: "10px",
                        paddingBottom: "10px",
                      }}
                      onClick={() => {
                        // console.log(
                        //   `Active party with uuid = ${activeGames.activeParties[index].uuid} picked`,
                        // );
                        navigation(`/resolvedReport/${value.uuid}`, {
                          replace: true,
                        });
                      }}
                    >
                      Пересмотреть жалобу
                    </Button>
                    <div style={{ paddingTop: "10px" }}></div>
                  </div>
                );
              })}
            </Slider>
          </div>
        ) : null}
      </div>
    ) : (
      <div style={{ display: "grid", width: "100%" }}>
        <div>
          <h2>{`Логин: ${contextValue.sessionCredentials.login}`}</h2>
          <h2>{`Роль: ${contextValue.sessionCredentials.role}`}</h2>
          {/*<h2>{`Country: ${contextValue.sessionCredentials.country}`}</h2>*/}
          <Button
            sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
            onClick={accountExitClick}
          >
            Выйти из учётной записи
          </Button>
        </div>
        <div
          id="sidebar"
          style={{ position: "absolute", left: "40%", top: "15%" }}
        >
          <Button
            onClick={() => {
              socketConnect();
            }}
            sx={{
              width: "300px",
              height: "50px",
              paddingTop: "12px",
              left: "30px",
            }}
          >
            Начать поиск партии
          </Button>
          {searchGame ? (
            <div
              style={{
                width: "300px",
                height: "100px",
                paddingTop: "12px",
                left: "30px",
              }}
            >
              <CircularProgress />
            </div>
          ) : null}
          {searchGame ? (
            <Button
              sx={{
                width: "300px",
                height: "50px",
                paddingTop: "12px",
                left: "30px",
              }}
              onClick={() => {
                socketDisconnect();
              }}
            >
              Завершить поиск партии
            </Button>
          ) : null}
          {searchGame && inviteUuid.length ? (
            // <div
            //   style={{ paddingTop: "15px", height: "200px", width: "370px" }}
            // >
            //   <TextField
            //     // sx={{
            //     //   width: "100%",
            //     //   // maxWidth: "300px",
            //     //   // height: "200px",
            //     //   //paddingTop: "50px",
            //     //   //left: "10px",
            //     // }}
            //     fullWidth
            //     multiline={true}
            //     disabled={true}
            //     value={`Для начала игры с другом\nподелитесь данной ссылкой:\n${"localhost:3000/gameInvite/" + inviteUuid}`} //TODO
            //   />
            // </div>
            <div
              style={{
                paddingTop: "15px",
                height: "200px",
                width: "370px",
                display: "grid",
              }}
            >
              <TextField
                disabled={true}
                multiline
                value={`Для начала игры с другом \nподелитесь данной ссылкой:`} //TODO
              />
              <Basic value={`${"localhost:3000/gameInvite/" + inviteUuid}`} />
            </div>
          ) : null}
          <nav>
            <ul>
              <li style={{ paddingTop: "15px" }}>
                <Button
                  sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
                  onClick={() => {
                    getActiveGames();
                  }}
                >
                  Просмотреть активные партии
                </Button>
              </li>
              <li style={{ paddingTop: "15px" }}>
                <Button
                  sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
                  onClick={() => {
                    getFinishedGames();
                  }}
                >
                  Просмотреть завершённые партии
                </Button>
              </li>
              <li style={{ paddingTop: "15px" }}>
                <Button
                  sx={{ width: "300px", height: "50px", paddingTop: "12px" }}
                  onClick={() => {
                    navigation(`/analysesParty`, {
                      replace: true,
                    });
                  }}
                >
                  Начать анализ партии
                </Button>
              </li>
            </ul>
          </nav>
        </div>
        {isActiveGamesSlider ? (
          <div
            style={{
              width: "370px",
              height: "370px",
              position: "absolute",
              left: "8%",
              top: "25%",
            }}
          >
            <h2>Активные партии</h2>
            <Slider {...settings}>
              {activeGames.activeGames.map((value, index) => {
                return (
                  <div
                    style={{ width: "200px", height: "200px", display: "grid" }}
                    onClick={() => {
                      // console.log(
                      //   `Active party with uuid = ${activeGames.activeParties[index].uuid} picked`,
                      // );
                      navigation(
                        `/activeParty/${activeGames.activeGames[index].uuid}`,
                        {
                          replace: true,
                        },
                      );
                    }}
                  >
                    <h3>{activeGames.opponents[index].login}</h3>
                    <Chessboard
                      arePiecesDraggable={false}
                      customBoardStyle={{
                        borderRadius: "4px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
                      }}
                      position={activeGames.activeParties[index].currentPos}
                      boardOrientation={
                        value?.userWUuid ===
                        contextValue.sessionCredentials?.uuid
                          ? "white"
                          : "black"
                      }
                      customSquareStyles={{
                        [activeGames.partyMoves[index].find(
                          (value1) =>
                            value1.index ===
                            activeGames.partyMoves[index].length,
                        )?.from as string]: {
                          background: "rgba(255, 255, 0, 0.4)",
                        },
                        // [activeGames.partyMoves[index][
                        //   activeGames.partyMoves[index].length - 1
                        // ]?.to as string]: {
                        //   background: "rgba(255, 255, 0, 0.4)",
                        // },
                        [activeGames.partyMoves[index].find(
                          (value1) =>
                            value1.index ===
                            activeGames.partyMoves[index].length,
                        )?.to as string]: {
                          background: "rgba(255, 255, 0, 0.4)",
                        },
                      }}
                    ></Chessboard>
                  </div>
                );
              })}
            </Slider>
          </div>
        ) : null}
        {isFinishedGamesSlider ? (
          <div
            style={{
              width: "370px",
              height: "370px",
              position: "absolute",
              left: "70%",
              top: "25%",
            }}
          >
            <h2>Завершённые партии</h2>
            <Slider {...settings}>
              {finishedGames.activeGames.map((value, index) => {
                return (
                  <div
                    style={{
                      width: "200px",
                      height: "200px",
                      display: "grid",
                    }}
                    onClick={() => {
                      // console.log(
                      //   `Active party with uuid = ${activeGames.activeParties[index].uuid} picked`,
                      // );
                      navigation(
                        `/analysesParty/${finishedGames.activeGames[index].uuid}`,
                        {
                          replace: true,
                        }, //TODO
                      );
                    }}
                  >
                    <h3>{finishedGames.opponents[index].login}</h3>
                    <Chessboard
                      arePiecesDraggable={false}
                      customBoardStyle={{
                        borderRadius: "4px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
                      }}
                      position={finishedGames.activeParties[index].currentPos}
                      boardOrientation={
                        value?.userWUuid ===
                        contextValue.sessionCredentials?.uuid
                          ? "white"
                          : "black"
                      }
                      customSquareStyles={{
                        // [finishedGames.partyMoves[index][
                        //   finishedGames.partyMoves[index].length - 1
                        // ]?.from as string]: {
                        //   background: "rgba(255, 255, 0, 0.4)",
                        // },
                        // [finishedGames.partyMoves[index][
                        //   finishedGames.partyMoves[index].length - 1
                        // ]?.to as string]: {
                        //   background: "rgba(255, 255, 0, 0.4)",
                        // },
                        [finishedGames.partyMoves[index].find(
                          (value1) =>
                            value1.index ===
                            finishedGames.partyMoves[index].length,
                        )?.from as string]: {
                          background: "rgba(255, 255, 0, 0.4)",
                        },
                        [finishedGames.partyMoves[index].find(
                          (value1) =>
                            value1.index ===
                            finishedGames.partyMoves[index].length,
                        )?.to as string]: {
                          background: "rgba(255, 255, 0, 0.4)",
                        },
                      }}
                    ></Chessboard>
                  </div>
                );
              })}
            </Slider>
          </div>
        ) : null}
      </div>
    )
  ) : (
    <div style={{ display: "grid", width: "100%" }}>
      <h2 style={{ position: "absolute", left: "38%", top: "7%" }}>
        Неавторизованный пользователь
      </h2>
      <div
        id="sidebar"
        style={{ position: "absolute", left: "40%", top: "15%" }}
      >
        <nav>
          <ul>
            <li style={{ paddingTop: "15px" }}>
              <Button
                sx={{ width: "200px", height: "50px", paddingTop: "25px" }}
                onClick={() => {
                  setRegDialog(true);
                }}
              >
                Регистрация
              </Button>
            </li>
            <li style={{ paddingTop: "15px" }}>
              <Button
                sx={{ width: "200px", height: "50px", paddingTop: "25px" }}
                onClick={() => {
                  setAuthDialog(true);
                }}
              >
                Авторизация
              </Button>
            </li>
            <li style={{ paddingTop: "15px" }}>
              <Button
                sx={{ width: "200px", height: "50px", paddingTop: "25px" }}
                onClick={() => {
                  navigation(`/analysesParty`, {
                    replace: true,
                  });
                }}
              >
                Начать анализ партии
              </Button>
            </li>
          </ul>
        </nav>
      </div>
      <Dialog
        open={authDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id={"alert-dialog-title"}>Авторизация</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          <nav>
            <ul>
              <li style={{ paddingTop: "15px" }}>
                <TextField
                  value={login}
                  label="Введите логин"
                  type="text"
                  onChange={(event) => {
                    setLogin(event.target.value);
                  }}
                />
              </li>
              <li style={{ paddingTop: "15px" }}>
                <TextField
                  value={password}
                  label="Введите пароль"
                  type="password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                />
              </li>
            </ul>
          </nav>
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setAuthDialog(false);
            }}
          >
            Отмена
          </Button>
          <Button
            variant={"text"}
            color={"success"}
            onClick={() => {
              setAuthDialog(false);
              handleClick();
            }}
          >
            Авторизоваться
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={regDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id={"alert-dialog-title"}>Регистрация</DialogTitle>
        <DialogContent id={"alert-dialog-description"}>
          <ul>
            <li style={{ paddingTop: "10px" }}>
              <TextField
                value={loginReg}
                label="Логин"
                type="text"
                onChange={(event) => {
                  setLoginReg(event.target.value);
                }}
              />
            </li>
            <li style={{ paddingTop: "10px" }}>
              <TextField
                value={passwordReg}
                label="Пароль"
                type="password"
                onChange={(event) => {
                  setPasswordReg(event.target.value);
                }}
              />
            </li>
            <li style={{ paddingTop: "10px" }}>
              <TextField
                value={firstNameReg}
                label="Имя"
                type="text"
                onChange={(event) => {
                  setFirstNameReg(event.target.value);
                }}
              />
            </li>
            <li style={{ paddingTop: "10px" }}>
              <TextField
                value={lastNameReg}
                label="Фамилия"
                type="text"
                onChange={(event) => {
                  setLastNameReg(event.target.value);
                }}
              />
            </li>
            <li style={{ paddingTop: "10px" }}>
              <TextField
                value={countryReg}
                label="Страна"
                type="text"
                onChange={(event) => {
                  setCountryReg(event.target.value);
                }}
              />
            </li>
          </ul>
        </DialogContent>
        <DialogActions>
          <Button
            variant={"text"}
            color={"warning"}
            onClick={() => {
              setRegDialog(false);
            }}
          >
            Отмена
          </Button>
          <Button
            variant={"text"}
            color={"success"}
            onClick={() => {
              setRegDialog(false);
              handleRegistr();
            }}
          >
            Зарегестрироваться
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
