#!/bin/bash
# Configura npm para usar un prefix en $HOME (evita necesitar sudo para npm link/install -g)

NPM_PREFIX="$HOME/.npm-global"

mkdir -p "$NPM_PREFIX"
npm config set prefix "$NPM_PREFIX"

# Detectar shell config file
if [ -n "$ZSH_VERSION" ] || [ -f "$HOME/.zshrc" ]; then
    SHELL_RC="$HOME/.zshrc"
else
    SHELL_RC="$HOME/.bashrc"
fi

# Agregar al PATH solo si no está ya
if ! grep -q '.npm-global/bin' "$SHELL_RC" 2>/dev/null; then
    echo '' >> "$SHELL_RC"
    echo '# npm global sin sudo' >> "$SHELL_RC"
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$SHELL_RC"
    echo "Agregado PATH a $SHELL_RC"
else
    echo "PATH ya configurado en $SHELL_RC"
fi

echo ""
echo "Listo. Ejecutá: source $SHELL_RC"
echo "Después podés hacer: npm link"
