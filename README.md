# Mirror Neuron Avatar — Web Edition

Avatar 2D con modelo de neuronas espejo, visualización matemática en tiempo real y detección de gestos por cámara. Corre 100% en el navegador — sin backend, sin instalación.

🌐 **Demo en vivo:** `https://<tu-usuario>.github.io/<nombre-repo>/`

---

## Modelo implementado

$$z[k] = \phi(W_{SM}\,x[k] + b)$$

$$m[k+1] = (1-\alpha)\,m[k] + \alpha\,z[k]$$

$$q[k] = K\,m[k]$$

$$\Delta W = \eta\,(m^*-m)\,x^\top$$

| Variable | Dimensión | Descripción |
|----------|-----------|-------------|
| `x[k]`  | ℝ⁸        | Gesto observado (comprimido de 21 landmarks MediaPipe) |
| `z[k]`  | ℝ¹⁶       | Activación instantánea capa espejo |
| `m[k]`  | ℝ¹⁶       | Estado dinámico población espejo |
| `q[k]`  | ℝ⁸        | Salida motora → avatar |
| `W_SM`  | 16×8      | Matriz sensoriomotora |
| `K`     | 8×16      | Proyección motora |

---

## Estructura del proyecto

```
├── index.html      # Aplicación principal (dos pestañas)
├── style.css       # Diseño (dark neuroscience palette)
├── model.js        # Modelo matemático (W_SM, dinámica, Hebbian)
├── avatar.js       # Renderizado 2D del avatar en Canvas
├── charts.js       # Chart.js: series temporales + heatmap W_SM
├── app.js          # Controlador: MediaPipe, loop, UI, teclado
└── .github/
    └── workflows/
        └── deploy.yml  # Deploy automático a GitHub Pages
```

---

## Deploy en GitHub Pages (3 pasos)

### 1. Crear el repositorio

```bash
git init
git add .
git commit -m "feat: mirror neuron avatar web"
git remote add origin https://github.com/<usuario>/<repo>.git
git push -u origin main
```

### 2. Activar GitHub Pages

En tu repositorio → **Settings → Pages**:
- Source: **GitHub Actions**
- Guardar

### 3. Listo

El workflow `deploy.yml` se ejecuta automáticamente en cada push a `main`.  
La URL será: `https://<usuario>.github.io/<repo>/`

---

## Controles

| Tecla | Acción |
|-------|--------|
| `TAB` | Cambiar entre pestañas |
| `L`   | Activar / detener aprendizaje online |
| `P`   | Perturbar matriz W_SM |
| `R`   | Reiniciar modelo |
| `C`   | Cambiar cámara |

---

## Secuencia de demostración sugerida

1. Abrir en el navegador — la cámara se activa automáticamente.
2. Observar el avatar replicar la postura de la mano en la pestaña **Interacción**.
3. Cambiar a la pestaña **Modelo Matemático** para ver vectores y W_SM en tiempo real.
4. Presionar `P` para perturbar W_SM — observar cómo aumenta el error.
5. Presionar `L` para activar el aprendizaje — observar cómo el error decrece.
6. Ajustar α y η con los sliders para mostrar el efecto de los hiperparámetros.

---

## Stack tecnológico

- **MediaPipe Hands JS** — detección de landmarks de mano en tiempo real (WebAssembly)
- **Chart.js 4** — visualización de series temporales y evolución del error
- **Canvas 2D API** — renderizado del avatar y heatmap de W_SM
- **KaTeX** — renderizado de ecuaciones matemáticas
- **GitHub Pages + GitHub Actions** — deploy estático gratuito

---

## Créditos

Desarrollado en el **CHARM Lab** — Universidad de las Américas (UDLA), Santiago de Chile.  
Línea de investigación: Cognitive Digital Twins · Human-Robot Interaction.
