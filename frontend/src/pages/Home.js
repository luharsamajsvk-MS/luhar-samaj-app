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
    <Container maxWidth="md" sx={{ mt: 6, textAlign: "center" }}>
      {/* Hero Section */}
      <Box sx={{ mb: 6 }}>
        <img
          src={logo}
          alt="સમાજ લોગો"
          style={{ width: 120, marginBottom: 16 }}
        />
        <Typography
          variant="h3"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#b71c1c" }}
        >
          શ્રી સમસ્ત લુહાર સમાજ સાવરકુંડલા
        </Typography>
        <Typography variant="h6" sx={{ color: "text.secondary", mb: 4 }}>
          મેનેજમેન્ટ અને ઓળખપત્ર બનાવવાની વ્યવસ્થા
        </Typography>

        {/* Only Login Button */}
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            to="/login"
            sx={{
              borderRadius: "25px",
              px: 5,
              py: 1.2,
              fontSize: "1.1rem",
            }}
          >
            LOGIN
          </Button>
        </Box>
      </Box>

      {/* Quick Info Section */}
      <Grid container spacing={3} justifyContent="center" sx={{ mb: 6 }}>
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
          <Grid item xs={12} sm={4} key={i}>
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: 2,
                height: "100%",
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
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
          backgroundColor: "#f5f5f5",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          © {new Date().getFullYear()} શ્રી સમસ્ત લુહાર સમાજ – આંતરિક મેનેજમેન્ટ સિસ્ટમ
        </Typography>
      </Box>
    </Container>
  );
}
