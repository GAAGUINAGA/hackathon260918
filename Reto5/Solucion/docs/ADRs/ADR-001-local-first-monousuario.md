# ADR-001: Local-first monousuario

## Contexto
El reto pide una solución de clasificación documental ejecutable de forma autónoma,
sin requisitos de multiusuario ni despliegue web.

## Decisión
Ejecución en una sola máquina, monousuario, procesando una carpeta local de entrada.

## Consecuencias
Alcance simplificado, mayor privacidad (sin exposición de red por defecto) y menor
complejidad de infraestructura. Preparado para añadir autenticación/multiusuario en
versiones futuras sin reescribir el core (puertos/adaptadores).
