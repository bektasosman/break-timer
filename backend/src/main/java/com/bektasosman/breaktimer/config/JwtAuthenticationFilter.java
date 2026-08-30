package com.bektasosman.breaktimer.config;

import com.bektasosman.breaktimer.service.CustomUserDetailsService;
import com.bektasosman.breaktimer.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String email;

        // 1. Wenn kein "Bearer "-Header da ist -> Anfrage unberührt weiterleiten
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Token isolieren ("Bearer " = 7 Zeichen abschneiden)
        jwt = authHeader.substring(7);
        email = jwtService.extractEmail(jwt);

        // 3. Wenn Email existiert und der User in Spring Security noch nicht als authentifiziert gilt
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userService.loadUserByUsername(email);

            // 4. Ist der Token echt und nicht abgelaufen?
            if (jwtService.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 5. User für DIESE Anfrage im System als "eingeloggt" markieren!
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // 6. Weiterleitung zum eigentlichen Controller
        filterChain.doFilter(request, response);
    }
}