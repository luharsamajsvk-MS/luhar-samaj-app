// frontend/src/pages/Home.js
import React from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { Link } from "react-router-dom";
import logo from "../assets/images/stamp1.png"; // 👈 તમારો લોગો

export default function Home() {
  return (
    <Container maxWidth="lg" sx={{ mt: 6, textAlign: "center" }}>
      {/* Hero Section */}
      <Box sx={{ mb: 8 }}>
        <img
          src={logo}
          alt="સમાજ લોગો"
          style={{
            width: 130,
            marginBottom: 20,
            filter: "drop-shadow(0px 4px 6px rgba(0,0,0,0.3))",
          }}
        />

        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: "bold",
            color: "primary.main",
            textShadow: "2px 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા
        </Typography>

        <Typography
          variant="h6"
          sx={{
            color: "text.secondary",
            mb: 5,
            fontStyle: "italic",
          }}
        >
          મેનેજમેન્ટ અને ઓળખપત્ર બનાવવાની વ્યવસ્થા
        </Typography>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            size="large"
            component={Link}
            to="/login"
            sx={{
              borderRadius: "30px",
              px: 5,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #1565c0, #1e88e5)",
              boxShadow: "0 4px 12px rgba(21,101,192,0.4)",
              "&:hover": {
                background: "linear-gradient(135deg, #0d47a1, #1565c0)",
              },
            }}
          >
            LOGIN
          </Button>

          <Button
            variant="outlined"
            size="large"
            component={Link}
            to="/request"
            sx={{
              borderRadius: "30px",
              px: 5,
              py: 1.5,
              fontSize: "1.1rem",
              fontWeight: "bold",
              borderColor: "secondary.main",
              color: "secondary.main",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "secondary.main",
                color: "#fff",
              },
            }}
          >
            REGISTER
          </Button>
        </Box>
      </Box>

      {/* Info Section */}
      <Grid container spacing={4} justifyContent="center" sx={{ mb: 8 }}>
        {[
          {
            title: "અમારો હેતુ",
            desc: "લુહાર સમાજને એકતા, સંસ્કૃતિ અને આધુનિક સાધનોથી સશક્ત બનાવવો.",
          },
          {
            title: "અમારું કાર્ય",
            desc: "સભ્યો, ઝોનનું સંચાલન અને વ્યાવસાયિક ઓળખપત્ર બનાવવાની સુવિધા.",
          },
          {
            title: "સંપર્ક",
            desc: "સાવરકુંડલા, જીલ્લો અમરેલી (ગુજરાત) 📞 9499750663",
          },
        ].map((item, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card
              sx={{
                borderRadius: 4,
                boxShadow: 3,
                height: "100%",
                transition: "transform 0.3s, box-shadow 0.3s",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    mb: 1.5,
                    color: "primary.main",
                  }}
                >
                  {item.title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "text.secondary", lineHeight: 1.6 }}
                >
                  {item.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Footer */}
      <Box
        sx={{
          py: 3,
          textAlign: "center",
          background:
            "linear-gradient(to right, rgba(245,245,245,0.9), rgba(250,250,250,0.9))",
          borderRadius: 2,
          boxShadow: 1,
          mt: 4,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", fontWeight: 500 }}
        >
          © {new Date().getFullYear()} શ્રી સમસ્ત લુહાર સમાજ – આંતરિક મેનેજમેન્ટ સિસ્ટમ
        </Typography>
      </Box>
    </Container>
  );
}
