BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

sh ./scripts/build/create-ekko-app.sh

echo "Installing $BINARY to $GOBIN"
cp "bin/$BINARY" "$GOBIN/$BINARY" || exit 1
echo "✓ Installed $BINARY to $GOBIN"
